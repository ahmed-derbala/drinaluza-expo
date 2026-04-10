import React, { createContext, useContext, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { Audio } from 'expo-av'
import { BACKEND_URL } from '@/config'
import { useUser } from './UserContext'
import { useNotification } from './NotificationContext'
import { toast } from '../helpers/toast'
import { log } from '../log'

interface SocketContextType {
	socket: Socket | null
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { user } = useUser()
	const { refreshNotificationCount } = useNotification()
	const socketRef = useRef<Socket | null>(null)
	const soundRef = useRef<Audio.Sound | null>(null)

	useEffect(() => {
		// Initialize sound
		const loadSound = async () => {
			try {
				const { sound } = await Audio.Sound.createAsync(require('../../assets/sounds/notification.mp3'))
				soundRef.current = sound
			} catch (error) {
				log({ level: 'error', label: 'socket', message: 'Failed to load notification sound', error })
			}
		}

		loadSound()

		// Initialize socket
		const socket = io(BACKEND_URL, {
			transports: ['websocket'],
			autoConnect: true,
			reconnection: true,
			reconnectionAttempts: 10
		})

		socketRef.current = socket

		socket.on('connect', () => {
			console.log('[Socket] Connected to server:', socket.id)
			log({ level: 'info', label: 'socket', message: 'Connected to socket server', data: { id: socket.id } })
			if (user?.slug) {
				console.log('[Socket] Joining room:', user.slug)
				socket.emit('join', user.slug)
			}
		})

		socket.on('connect_error', (error) => {
			console.error('[Socket] Connection error:', error.message)
			log({ level: 'error', label: 'socket', message: 'Socket connection error', error })
		})

		socket.on('new_notification', async (data: any) => {
			console.log('[Socket] New notification received:', data)
			log({ level: 'info', label: 'socket', message: 'Received new notification', data })

			// Play sound
			try {
				if (soundRef.current) {
					await soundRef.current.replayAsync()
				}
			} catch (error) {
				console.error('Error playing notification sound:', error)
			}

			// Show toast
			const message = data.content || data.title || 'New notification received'
			toast.info(message, {
				duration: 5000
			})

			// Refresh count
			refreshNotificationCount()
		})

		socket.on('disconnect', (reason) => {
			log({ level: 'info', label: 'socket', message: 'Disconnected from socket server', data: { reason } })
		})

		return () => {
			socket.disconnect()
			if (soundRef.current) {
				soundRef.current.unloadAsync()
			}
		}
	}, [refreshNotificationCount])

	// Re-join room when user slug changes
	useEffect(() => {
		if (socketRef.current?.connected && user?.slug) {
			socketRef.current.emit('join', user.slug)
		}
	}, [user?.slug])

	return <SocketContext.Provider value={{ socket: socketRef.current }}>{children}</SocketContext.Provider>
}

export const useSocket = () => {
	const context = useContext(SocketContext)
	if (context === undefined) {
		throw new Error('useSocket must be used within a SocketProvider')
	}
	return context
}
