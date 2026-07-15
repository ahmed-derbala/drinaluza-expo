import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { secureGetItem } from '@/core/storage'
import { getNotifications } from './notifications.api'
import { log } from '@/core/log'

const REFRESH_COOLDOWN_MS = 5000

interface NotificationContextType {
	notificationCount: number
	refreshNotificationCount: () => Promise<void>
	decrementNotificationCount: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [notificationCount, setNotificationCount] = useState<number>(0)
	const lastRefreshRef = useRef<number>(0)

	const refreshNotificationCount = useCallback(async () => {
		try {
			// Don't fetch if we don't have a token
			const token = await secureGetItem('authToken')
			if (!token) return

			const now = Date.now()
			if (now - lastRefreshRef.current < REFRESH_COOLDOWN_MS) return
			lastRefreshRef.current = now

			const response = await getNotifications(1, 20)
			const unseen = response.data.docs.filter((n) => !n.seenAt).length
			setNotificationCount(unseen)
		} catch (error) {
			log({ level: 'error', label: 'NotificationContext', message: 'Failed to fetch notifications count', error })
		}
	}, [])

	const decrementNotificationCount = useCallback(() => {
		setNotificationCount((prev) => Math.max(0, prev - 1))
	}, [])

	useEffect(() => {
		refreshNotificationCount()
	}, [refreshNotificationCount])

	return <NotificationContext.Provider value={{ notificationCount, refreshNotificationCount, decrementNotificationCount }}>{children}</NotificationContext.Provider>
}

export const useNotification = () => {
	const context = useContext(NotificationContext)
	if (!context) {
		throw new Error('useNotification must be used within a NotificationProvider')
	}
	return context
}
