import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { getNotifications } from './notifications.api'
import { log } from '@/core/log'
import { deferStartup } from '@/core/helpers/defer'
import { useUser } from '@/core/contexts/UserContext'

const BASE_REFRESH_COOLDOWN_MS = 5000
const MAX_REFRESH_BACKOFF_MS = 60000

interface NotificationContextType {
	notificationCount: number
	refreshNotificationCount: () => Promise<void>
	decrementNotificationCount: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { user, loading: userLoading } = useUser()
	const [notificationCount, setNotificationCount] = useState<number>(0)
	const lastRefreshRef = useRef<number>(0)
	const refreshCooldownRef = useRef<number>(BASE_REFRESH_COOLDOWN_MS)

	const refreshNotificationCount = useCallback(async () => {
		// Wait for user load, then gate by authenticated user — prevents 401 when no connected user
		if (userLoading) return
		if (!user) {
			setNotificationCount(0)
			return
		}

		try {
			const now = Date.now()
			if (now - lastRefreshRef.current < refreshCooldownRef.current) return
			lastRefreshRef.current = now

			const response = await getNotifications(1, 20, 'unseen')
			setNotificationCount(response.data.pagination.totalDocs)
			refreshCooldownRef.current = BASE_REFRESH_COOLDOWN_MS
		} catch (error: any) {
			const status = error?.response?.status
			// 401 is expected when token expired / user logged out — don't spam error logs
			if (status === 401) {
				setNotificationCount(0)
				return
			}
			// 429 means the server-side window is closed — back off exponentially so repeated
			// triggers don't keep re-entering it. Honor Retry-After when the server sends one.
			if (status === 429) {
				const retryAfterSeconds = Number(error?.response?.headers?.['retry-after'])
				const retryAfterMs = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : 0
				refreshCooldownRef.current = Math.min(Math.max(refreshCooldownRef.current * 2, retryAfterMs), MAX_REFRESH_BACKOFF_MS)
				log({
					level: 'warn',
					label: 'NotificationContext',
					message: 'Notification count refresh rate-limited, backing off',
					data: { cooldownMs: refreshCooldownRef.current }
				})
				return
			}
			log({ level: 'error', label: 'NotificationContext', message: 'Failed to fetch notifications count', error })
		}
	}, [user, userLoading])

	const decrementNotificationCount = useCallback(() => {
		setNotificationCount((prev) => Math.max(0, prev - 1))
	}, [])

	useEffect(() => {
		// Defer notification count fetch — not needed for feed paint, and avoids
		// competing with feed's getFeed for the token/network at startup
		const cancel = deferStartup.normal(() => {
			refreshNotificationCount()
		})
		return cancel
	}, [refreshNotificationCount])

	// Reset count immediately when user logs out / switches
	useEffect(() => {
		if (!userLoading && !user) {
			setNotificationCount(0)
		}
	}, [user, userLoading])

	const value = useMemo(() => ({ notificationCount, refreshNotificationCount, decrementNotificationCount }), [notificationCount, refreshNotificationCount, decrementNotificationCount])

	return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export const useNotification = () => {
	const context = useContext(NotificationContext)
	if (!context) {
		throw new Error('useNotification must be used within a NotificationProvider')
	}
	return context
}
