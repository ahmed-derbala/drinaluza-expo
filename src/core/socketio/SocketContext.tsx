import { colors as themeColors } from '@/core/theme'
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { Socket } from 'socket.io-client'
import { useRouter } from 'expo-router'
import { ConnectionService } from '@/core/connection'
import { useUser } from '../contexts/UserContext'
import { useNotification } from '../../features/notifications/NotificationContext'
import { toast } from '@/features/common/Toast'
import { log } from '../log'
import { getDashboardProfiles } from '../../features/dashboard/dashboard.api'

interface SocketContextType {
	socket: Socket | null
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { user } = useUser()
	const { refreshNotificationCount } = useNotification()
	const router = useRouter()
	const [socket, setSocket] = useState<Socket | null>(ConnectionService.getSocket())

	useEffect(() => {
		// Only connect if user is logged in
		if (!user?.slug) {
			ConnectionService.disconnect()
			setSocket(null)
			return
		}

		log({ level: 'info', label: 'socket', message: `Initializing for user: ${user.slug}` })
		ConnectionService.connect(user.slug)
		setSocket(ConnectionService.getSocket())

		const currentSocket = ConnectionService.getSocket()
		if (!currentSocket) return

		const handleNewNotification = async (data: any) => {
			log({ level: 'info', label: 'socket', message: 'Received new notification', data })

			const toastTitle = data.title || 'New notification'
			const toastMessage = data.content || ''

			let targetScreen = data.screen
			let customOnPress: (() => void) | undefined

			if (targetScreen === '/business/sales') {
				targetScreen = undefined
				customOnPress = async () => {
					try {
						const profilesRes = await getDashboardProfiles()
						const profileList = profilesRes.data?.filter((p: any) => p.kind === 'business') || []
						if (profileList.length > 0 && profileList[0].slug) {
							router.push(`/dashboard/${profileList[0].slug}/sales` as any)
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
				message: toastMessage,
				screen: targetScreen,
				onPress: customOnPress,
				color: themeColors.info
			})

			// Refresh count
			refreshNotificationCount()
		}

		currentSocket.on('new_notification', handleNewNotification)

		return () => {
			log({ level: 'info', label: 'socket', message: 'Cleaning up notification listener' })
			currentSocket.off('new_notification', handleNewNotification)
		}
	}, [user?.slug, refreshNotificationCount, router])

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
