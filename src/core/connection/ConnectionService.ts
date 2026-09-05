import { io, Socket } from 'socket.io-client'
import { config } from '@/config'
import { log } from '@log'

export type BackendState = 'connecting' | 'online' | 'offline'

type BackendStateListener = (state: BackendState) => void

/**
 * Maximum time (ms) to stay in "connecting" before falling back to "offline".
 * This prevents the state machine from getting stuck when WebSocket events
 * are blocked or silently dropped.
 */
const CONNECTING_TIMEOUT_MS = 8_000

// The "/public" namespace requires no authentication and is always kept connected;
// it's what drives the app-wide backend state (online/connecting/offline).
let publicSocket: Socket | null = null

// The "/private" namespace requires a valid auth token and only carries
// per-user events (e.g. new_notification). It's connected only while logged in.
let privateSocket: Socket | null = null
let currentToken: string | undefined = undefined
let backendState: BackendState = 'connecting'
let listeners: BackendStateListener[] = []
let initialized = false

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

// The "/public" namespace is always available (no auth) and is the sole
// driver of the app-wide backend state, so unauthenticated users (or a
// private-socket auth failure) never get reported as "offline".
const attachPublicSocketListeners = (socket: Socket) => {
	socket.on('connect', () => {
		log({ level: 'info', label: 'ConnectionService', message: 'Public socket connected', data: { id: socket.id } })
		setBackendState('online')
	})

	socket.on('disconnect', (reason) => {
		log({ level: 'info', label: 'ConnectionService', message: 'Public socket disconnected', data: { reason } })
		setBackendState('connecting')
	})

	socket.on('connect_error', (error) => {
		const message = error instanceof Error ? error.message : String(error)
		log({ level: 'warn', label: 'ConnectionService', message: `Public socket connect error: ${message}` })
		setBackendState('offline')
	})

	socket.on('reconnect_attempt', () => {
		log({ level: 'info', label: 'ConnectionService', message: 'Public socket reconnect attempt' })
		setBackendState('connecting')
	})

	socket.on('reconnect_failed', () => {
		log({ level: 'warn', label: 'ConnectionService', message: 'Public socket reconnect failed' })
		setBackendState('offline')
	})

	socket.on('reconnect', () => {
		log({ level: 'info', label: 'ConnectionService', message: 'Public socket reconnected' })
		setBackendState('online')
	})
}

// The "/private" namespace only carries per-user events; its connectivity
// doesn't drive the global backend state (see attachPublicSocketListeners).
const attachPrivateSocketListeners = (socket: Socket) => {
	socket.on('connect', () => {
		log({ level: 'info', label: 'ConnectionService', message: 'Private socket connected', data: { id: socket.id } })
	})

	socket.on('disconnect', (reason) => {
		log({ level: 'info', label: 'ConnectionService', message: 'Private socket disconnected', data: { reason } })
	})

	socket.on('connect_error', (error) => {
		const message = error instanceof Error ? error.message : String(error)
		log({ level: 'warn', label: 'ConnectionService', message: `Private socket connect error: ${message}` })
	})
}

const socketOptions = {
	transports: ['websocket' as const],
	autoConnect: true,
	reconnection: true,
	reconnectionAttempts: Infinity,
	reconnectionDelayMax: 5000,
	timeout: 5000 // Explicitly set 5s connection timeout so it times out quickly if offline/dropped
}

const createPublicSocket = (): Socket => io(`${config.backend.url}/public`, socketOptions)

const createPrivateSocket = (token: string): Socket =>
	io(`${config.backend.url}/private`, {
		...socketOptions,
		auth: { token }
	})

const disconnectPrivateSocket = () => {
	if (privateSocket) {
		privateSocket.removeAllListeners()
		privateSocket.disconnect()
		privateSocket = null
	}
	currentToken = undefined
}

export const ConnectionService = {
	/**
	 * Lazily opens the always-on public socket. Must be called from client-side
	 * code only (e.g. a useEffect), never at module load time: on web, Expo
	 * Router's static output prerenders routes in a Node context, and any
	 * socket opened as a module-level side effect gets duplicated — one
	 * connection from the prerender pass, one from the real browser.
	 */
	init: () => {
		if (initialized) return
		initialized = true
		setBackendState('connecting')
		publicSocket = createPublicSocket()
		attachPublicSocketListeners(publicSocket)
	},

	getPrivateSocket: (): Socket | null => privateSocket,
	getPublicSocket: (): Socket | null => publicSocket,

	getBackendState: (): BackendState => backendState,

	connect: (token?: string) => {
		if (!token) {
			disconnectPrivateSocket()
			return
		}

		if (privateSocket && currentToken === token) {
			return
		}

		disconnectPrivateSocket()

		currentToken = token
		privateSocket = createPrivateSocket(token)
		attachPrivateSocketListeners(privateSocket)
	},

	disconnect: () => {
		disconnectPrivateSocket()
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

export default ConnectionService
