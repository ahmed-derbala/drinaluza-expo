import { io, Socket } from 'socket.io-client'
import { config } from '@/config'
import { log } from '@/core/log'

export type BackendState = 'connecting' | 'online' | 'offline'

type BackendStateListener = (state: BackendState) => void

/**
 * Maximum time (ms) to stay in "connecting" before falling back to "offline".
 * This prevents the state machine from getting stuck when WebSocket events
 * are blocked or silently dropped.
 */
const CONNECTING_TIMEOUT_MS = 8_000

let socketInstance: Socket | null = null
let currentUserSlug: string | undefined = undefined
let backendState: BackendState = 'connecting'
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

// ── Connecting timeout ───────────────────────────────────────────────
let connectingTimer: ReturnType<typeof setTimeout> | null = null

const startConnectingTimeout = () => {
	clearConnectingTimeout()
	connectingTimer = setTimeout(() => {
		if (backendState === 'connecting') {
			log({
				level: 'info',
				label: 'ConnectionService',
				message: `Connecting timeout (${CONNECTING_TIMEOUT_MS}ms) — transitioning to offline`
			})
			setBackendState('offline')
		}
	}, CONNECTING_TIMEOUT_MS)
}

const clearConnectingTimeout = () => {
	if (connectingTimer) {
		clearTimeout(connectingTimer)
		connectingTimer = null
	}
}

// ── State machine ────────────────────────────────────────────────────
const setBackendState = (nextState: BackendState) => {
	if (backendState === nextState) return
	log({ level: 'info', label: 'ConnectionService', message: `Backend state changed: ${backendState} -> ${nextState}` })
	backendState = nextState

	switch (nextState) {
		case 'online':
			clearConnectingTimeout()
			break
		case 'connecting':
			startConnectingTimeout()
			break
		case 'offline':
			clearConnectingTimeout()
			break
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
		const message = error instanceof Error ? error.message : String(error)
		log({ level: 'warn', label: 'ConnectionService', message: `Socket connect error: ${message}` })
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

const createSocket = (userSlug?: string): Socket => {
	const query: Record<string, string> = {}
	if (userSlug) {
		query.userSlug = userSlug
	}
	return io(config.backend.url, {
		transports: ['websocket'],
		autoConnect: true,
		reconnection: true,
		reconnectionAttempts: Infinity,
		reconnectionDelayMax: 5000,
		timeout: 5000, // Explicitly set 5s connection timeout so it times out quickly if offline/dropped
		query
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
		// When disconnected (i.e. logged out or guest), we still want to keep a socket connection
		// to determine the backend state using Socket.io only.
		currentUserSlug = undefined
		setBackendState('connecting')
		socketInstance = createSocket()
		attachSocketListeners(socketInstance)
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

	// Stub API reporting methods to preserve compatibility with other modules (e.g. apiClient interceptors)
	// while ensuring backend state is determined by Socket.io only.
	reportApiSuccess: (..._args: any[]) => {},
	reportApiFailure: (..._args: any[]) => {}
}

// Boot: immediately start tracking backend state by establishing an anonymous socket connection
currentUserSlug = undefined
setBackendState('connecting')
socketInstance = createSocket()
attachSocketListeners(socketInstance)

export default ConnectionService
