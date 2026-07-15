import { io, Socket } from 'socket.io-client'
import { AxiosError } from 'axios'
import { config } from '@/config'
import { log } from '@/core/log'

export type BackendState = 'connecting' | 'online' | 'offline'

type BackendStateListener = (state: BackendState) => void

const MAX_CONSECUTIVE_FAILURES = 3

let socketInstance: Socket | null = null
let currentUserSlug: string | undefined = undefined
let backendState: BackendState = 'connecting'
let consecutiveFailureCount = 0
let listeners: BackendStateListener[] = []

const notifyListeners = () => {
	listeners.forEach((listener) => {
		try {
			listener(backendState)
		} catch (error) {
			log({ level: 'error', label: 'ConnectionService', message: 'Error notifying backend state listener', error })
		}
	})
}

const setBackendState = (nextState: BackendState) => {
	if (backendState === nextState) return
	log({ level: 'info', label: 'ConnectionService', message: `Backend state changed: ${backendState} -> ${nextState}` })
	backendState = nextState
	if (nextState === 'online') {
		consecutiveFailureCount = 0
	}
	notifyListeners()
}

const attachSocketListeners = (socket: Socket) => {
	socket.on('connect', () => {
		log({ level: 'info', label: 'ConnectionService', message: 'Socket connected', data: { id: socket.id } })
		setBackendState('online')
	})

	socket.on('disconnect', (reason) => {
		log({ level: 'info', label: 'ConnectionService', message: 'Socket disconnected', data: { reason } })
		setBackendState('connecting')
	})

	socket.on('connect_error', (error) => {
		log({ level: 'error', label: 'ConnectionService', message: 'Socket connect error', error })
		setBackendState('offline')
	})

	socket.on('reconnect_attempt', () => {
		log({ level: 'info', label: 'ConnectionService', message: 'Socket reconnect attempt' })
		setBackendState('connecting')
	})

	socket.on('reconnect_failed', () => {
		log({ level: 'warn', label: 'ConnectionService', message: 'Socket reconnect failed' })
		setBackendState('offline')
	})

	socket.on('reconnect', () => {
		log({ level: 'info', label: 'ConnectionService', message: 'Socket reconnected' })
		setBackendState('online')
	})
}

const createSocket = (userSlug: string): Socket => {
	return io(config.backend.url, {
		transports: ['websocket'],
		autoConnect: true,
		reconnection: true,
		reconnectionAttempts: config.app.retryAttempts || 3,
		query: {
			userSlug
		}
	})
}

export const ConnectionService = {
	getSocket: (): Socket | null => socketInstance,

	getBackendState: (): BackendState => backendState,

	connect: (userSlug?: string) => {
		if (!userSlug) {
			ConnectionService.disconnect()
			return
		}

		if (socketInstance && currentUserSlug === userSlug) {
			return
		}

		ConnectionService.disconnect()

		currentUserSlug = userSlug
		setBackendState('connecting')
		socketInstance = createSocket(userSlug)
		attachSocketListeners(socketInstance)
	},

	disconnect: () => {
		if (socketInstance) {
			socketInstance.removeAllListeners()
			socketInstance.disconnect()
			socketInstance = null
		}
		currentUserSlug = undefined
		setBackendState('connecting')
	},

	subscribe: (listener: BackendStateListener): (() => void) => {
		listeners.push(listener)
		listener(backendState)
		return () => {
			listeners = listeners.filter((l) => l !== listener)
		}
	},

	unsubscribe: (listener: BackendStateListener) => {
		listeners = listeners.filter((l) => l !== listener)
	},

	reportApiSuccess: () => {
		if (consecutiveFailureCount > 0 || backendState !== 'online') {
			consecutiveFailureCount = 0
			setBackendState('online')
		}
	},

	reportApiFailure: (error: AxiosError) => {
		const code = error.code || ''
		const isNetworkError = !error.response
		const isTimeout = code === 'ECONNABORTED' || code === 'ETIMEDOUT'

		if (!isNetworkError && !isTimeout) {
			return
		}

		consecutiveFailureCount += 1
		log({
			level: 'warn',
			label: 'ConnectionService',
			message: `API failure reported (${consecutiveFailureCount}/${MAX_CONSECUTIVE_FAILURES})`,
			error
		})

		if (consecutiveFailureCount >= MAX_CONSECUTIVE_FAILURES) {
			setBackendState('offline')
		}
	}
}

export default ConnectionService
