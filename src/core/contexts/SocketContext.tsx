import React, { createContext, useContext, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { View, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { BACKEND_URL } from '@/config'
import { useUser } from './UserContext'
import { useNotification } from './NotificationContext'
import { toast } from '../helpers/toast'
import { log } from '../log'

// Safely import expo-audio
let useAudioPlayer: any = null
try {
	useAudioPlayer = require('expo-audio').useAudioPlayer
} catch (e) {
	console.warn('expo-audio module not available')
}

interface SocketContextType {
	socket: Socket | null
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { user } = useUser()
	const { refreshNotificationCount } = useNotification()
	const router = useRouter()
	const socketRef = useRef<Socket | null>(null)

	// Initialize audio player
	const player = useAudioPlayer ? useAudioPlayer(require('../../../assets/sounds/notification.mp3')) : null

	// Auto-play is handled by the player object itself when play() is called

	useEffect(() => {
		// Only connect if user is logged in
		if (!user?.slug) {
			if (socketRef.current) {
				socketRef.current.disconnect()
				socketRef.current = null
			}
			return
		}

		console.log('[Socket] Initializing for user:', user.slug)

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
			console.log('[Socket] Connected to server:', socket.id)
			log({ level: 'info', label: 'socket', message: 'Connected to socket server', data: { id: socket.id, userSlug: user.slug } })
		})

		socket.on('connect_error', (error) => {
			console.error('[Socket] Connection error:', error.message)
			log({ level: 'error', label: 'socket', message: 'Socket connection error', error })
		})

		socket.on('new_notification', async (data: any) => {
			console.log('[Socket] New notification received:', data)
			log({ level: 'info', label: 'socket', message: 'Received new notification', data })

			// Play sound if available
			try {
				if (player) {
					player.play()
				}
			} catch (error) {
				console.error('Error playing notification sound:', error)
			}

			// Show toast
			const toastTitle = data.title || 'New notification'
			const toastMessage = data.content || ''

			toast.info(`${toastTitle}: ${toastMessage}`, {
				duration: 8000,
				onPress: data.screen ? () => router.push(data.screen as any) : undefined
			})

			// Refresh count
			refreshNotificationCount()
		})

		socket.on('disconnect', (reason) => {
			console.log('[Socket] Disconnected:', reason)
			log({ level: 'info', label: 'socket', message: 'Disconnected from socket server', data: { reason } })
		})

		return () => {
			console.log('[Socket] Cleaning up connection')
			socket.disconnect()
			socketRef.current = null
		}
	}, [user?.slug, refreshNotificationCount])

	return <SocketContext.Provider value={{ socket: socketRef.current }}>{children}</SocketContext.Provider>
}

export const useSocket = () => {
	const context = useContext(SocketContext)
	if (context === undefined) {
		throw new Error('useSocket must be used within a SocketProvider')
	}
	return context
}
