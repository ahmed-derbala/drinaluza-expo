import { useSyncExternalStore, useCallback } from 'react'
import { useTheme } from '@theme'
import { ConnectionService, BackendState } from '@connection'
import { triggerGlobalRefresh, useGlobalRefreshingState } from '@cache/useCacheFirst'
import { HeaderIconBaseButton } from './HeaderIconBaseButton'

export interface HeaderRefreshButtonProps {
	onRefresh?: () => void | Promise<void>
	isRefreshing?: boolean
	isOffline?: boolean
	backendState?: BackendState
	size?: number
	disabled?: boolean
}

const subscribeToBackendState = (onStoreChange: () => void): (() => void) => {
	return ConnectionService.subscribe(() => onStoreChange())
}

export function HeaderRefreshButton({ onRefresh, isRefreshing: isRefreshingProp, isOffline = false, backendState: backendStateProp, size, disabled = false }: HeaderRefreshButtonProps) {
	const liveBackendState = useSyncExternalStore(subscribeToBackendState, ConnectionService.getBackendState, ConnectionService.getBackendState)
	const globalRefreshing = useGlobalRefreshingState()
	const isRefreshing = isRefreshingProp ?? globalRefreshing

	const backendState = backendStateProp ?? liveBackendState
	const isBackendOffline = backendState === 'offline'
	const isBackendConnecting = backendState === 'connecting'
	// Backend unreachable (socket) or last fetch failed with a network/timeout
	// error (server unreachable or didn't respond within config.api.timeout):
	// show the red cloud-offline icon directly.
	const showOffline = isBackendOffline || isOffline
	// While a refresh is in flight (or the socket is still connecting), keep
	// spinning until the backend responds or showOffline becomes true.
	const showSpinner = !showOffline && (isRefreshing || isBackendConnecting)
	const { colors } = useTheme()

	const handleRefresh = useCallback(async () => {
		if (showSpinner || disabled) return
		if (onRefresh) {
			await onRefresh()
		} else {
			await triggerGlobalRefresh()
		}
	}, [onRefresh, showSpinner, disabled])

	const isDisabled = showSpinner || disabled
	const icon = showOffline ? 'cloud-offline' : 'refresh'
	const iconType = showOffline ? 'ionicons' : 'material'
	const iconColor = showOffline ? colors.error : colors.primary

	return (
		<HeaderIconBaseButton
			icon={icon}
			iconType={iconType}
			label={showOffline ? 'Offline' : 'Refresh'}
			onPress={handleRefresh}
			disabled={isDisabled}
			loading={showSpinner}
			iconColor={iconColor}
			size={size}
		/>
	)
}

export default HeaderRefreshButton
