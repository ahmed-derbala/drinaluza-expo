import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { ConnectionService, BackendState } from './ConnectionService'
import { deferStartup } from '@helpers/defer'

interface BackendConnectionContextType {
	backendState: BackendState
	isOnline: boolean
	isConnecting: boolean
	isOffline: boolean
}

const BackendConnectionContext = createContext<BackendConnectionContextType>({
	backendState: 'connecting',
	isOnline: false,
	isConnecting: true,
	isOffline: false
})

export const BackendConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [backendState, setBackendState] = useState<BackendState>(ConnectionService.getBackendState())

	useEffect(() => {
		// Subscribe immediately so state updates are not missed, but defer
		// opening the public socket until after feed paints.
		const unsubscribe = ConnectionService.subscribe((nextState) => {
			setBackendState(nextState)
		})

		// Defer WebSocket handshake — not needed for cached feed render
		const cancel = deferStartup.normal(() => {
			// Only ever runs on the client (effects don't run during web static prerendering)
			ConnectionService.init()
		})

		return () => {
			cancel()
			unsubscribe()
		}
	}, [])

	const value = useMemo(
		() => ({
			backendState,
			isOnline: backendState === 'online',
			isConnecting: backendState === 'connecting',
			isOffline: backendState === 'offline'
		}),
		[backendState]
	)

	return <BackendConnectionContext.Provider value={value}>{children}</BackendConnectionContext.Provider>
}

export const useBackendConnection = (): BackendConnectionContextType => {
	return useContext(BackendConnectionContext)
}

export default BackendConnectionContext
