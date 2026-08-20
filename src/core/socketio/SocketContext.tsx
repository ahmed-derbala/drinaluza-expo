import { themeColors } from '@/core/theme'
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { Socket } from 'socket.io-client'
import { useRouter } from 'expo-router'
import { ConnectionService } from '@/core/connection'
import { useUser } from '@/core/contexts/UserContext'
import { useNotification } from '@/features/notifications/NotificationContext'
import { toast } from '@/features/common/Toast'
import { log } from '@/core/log'
import { getToken } from '@/core/storage'
import { getDashboardProfiles } from '@/features/dashboard/dashboard.api'
import { DashboardProfile } from '@/features/dashboard/dashboard.interface'
import { PRIORITY_COLORS, Priority } from '@/features/common/PriorityBadge'
import { getNotificationTemplateColor } from '@/features/notifications/notifications.constant'

interface SocketContextType {
	socket: Socket | null
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { user, localize } = useUser()
	const { refreshNotificationCount } = useNotification()
	const router = useRouter()
	const [socket, setSocket] = useState<Socket | null>(ConnectionService.getPrivateSocket())

	useEffect(() => {
		// Only connect if user is logged in
		if (!user?.slug) {
			ConnectionService.disconnect()
			setSocket(null)
			return
		}

		let cancelled = false
		let currentSocket: Socket | null = null

		const handleNewNotification = async (data: any) => {
			log({ level: 'info', label: 'socket', message: 'Received new notification', data })

			const toastTitle = localize(data.title) || 'New notification'
			const toastMessage = localize(data.content) || ''
			const priorityColor = data.priority ? PRIORITY_COLORS[data.priority as Priority] : undefined
			const templateColor = getNotificationTemplateColor(data.template?.slug)

			let targetScreen = data.screen
			let customOnPress: (() => void) | undefined

			if (targetScreen === '/business/sales') {
				targetScreen = undefined
				customOnPress = async () => {
					try {
						const profilesRes = await getDashboardProfiles()
						const profileList = (profilesRes.data || []).filter((p): p is Extract<DashboardProfile, { kind: 'business' }> => p.kind === 'business')
						if (profileList.length > 0 && profileList[0].business?.slug) {
							router.push(`/dashboard/${profileList[0].business.slug}/sales` as any)
						} else {
							router.push('/' as any)
						}
					} catch (e) {
						log({ level: 'error', label: 'Socket', message: 'Failed to handle navigation for notification', error: e })
					}
				}
			}

			toast.show({
				title: toastTitle,
				content: toastMessage,
				imageUrl: data.media?.thumbnail?.url,
				screen: targetScreen,
				onPress: customOnPress,
				borderColor: templateColor ?? priorityColor
			})

			// Refresh count
			refreshNotificationCount()
		}

		const setup = async () => {
			const token = await getToken()
			if (cancelled || !token) return

			log({ level: 'info', label: 'socket', message: `Initializing private socket for user: ${user.slug}` })
			ConnectionService.connect(token)

			currentSocket = ConnectionService.getPrivateSocket()
			if (!currentSocket) return

			setSocket(currentSocket)
			currentSocket.on('new_notification', handleNewNotification)
		}

		setup()

		return () => {
			cancelled = true
			if (currentSocket) {
				log({ level: 'info', label: 'socket', message: 'Cleaning up notification listener' })
				currentSocket.off('new_notification', handleNewNotification)
			}
		}
	}, [user?.slug, refreshNotificationCount, router, localize])

	const value = useMemo(() => ({ socket }), [socket])

	return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

const useSocket = () => {
	const context = useContext(SocketContext)
	if (context === undefined) {
		throw new Error('useSocket must be used within a SocketProvider')
	}
	return context
}
