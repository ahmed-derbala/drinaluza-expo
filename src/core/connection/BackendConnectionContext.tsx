import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { ConnectionService, BackendState } from './ConnectionService'

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
		const unsubscribe = ConnectionService.subscribe((nextState) => {
			setBackendState(nextState)
		})
		return unsubscribe
	}, [])

	const value = {
		backendState,
		isOnline: backendState === 'online',
		isConnecting: backendState === 'connecting',
		isOffline: backendState === 'offline'
	}

	return <BackendConnectionContext.Provider value={value}>{children}</BackendConnectionContext.Provider>
}

export const useBackendConnection = (): BackendConnectionContextType => {
	return useContext(BackendConnectionContext)
}

export default BackendConnectionContext
