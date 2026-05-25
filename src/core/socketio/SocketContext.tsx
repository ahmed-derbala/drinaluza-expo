import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { View, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { BACKEND_URL } from '@/config'
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
	const socketRef = useRef<Socket | null>(null)

	useEffect(() => {
		// Only connect if user is logged in
		if (!user?.slug) {
			if (socketRef.current) {
				socketRef.current.disconnect()
				socketRef.current = null
			}
			return
		}

		log({ level: 'info', label: 'socket', message: `Initializing for user: ${user.slug}` })

		// Initialize socket with query for room auto-join
		const socket = io(BACKEND_URL, {
			transports: ['websocket'],
			autoConnect: true,
			reconnection: true,
			reconnectionAttempts: 10,
			query: {
				userSlug: user.slug
			}
		})

		socketRef.current = socket

		socket.on('connect', () => {
			log({ level: 'info', label: 'socket', message: 'Connected to socket server', data: { id: socket.id, userSlug: user.slug } })
		})

		socket.on('connect_error', (error) => {
			log({ level: 'error', label: 'socket', message: 'Socket connection error', error })
		})

		socket.on('new_notification', async (data: any) => {
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
						console.error(e)
					}
				}
			}

			toast.show({
				title: toastTitle,
				message: toastMessage,
				screen: targetScreen,
				onPress: customOnPress,
				color: '#3B82F6'
			})

			// Refresh count
			refreshNotificationCount()
		})

		socket.on('disconnect', (reason) => {
			log({ level: 'info', label: 'socket', message: 'Disconnected from socket server', data: { reason } })
		})

		return () => {
			log({ level: 'info', label: 'socket', message: 'Cleaning up connection' })
			socket.disconnect()
			socketRef.current = null
		}
	}, [user?.slug, refreshNotificationCount])

	return <SocketContext.Provider value={{ socket: socketRef.current }}>{children}</SocketContext.Provider>
}

const useSocket = () => {
	const context = useContext(SocketContext)
	if (context === undefined) {
		throw new Error('useSocket must be used within a SocketProvider')
	}
	return context
}
