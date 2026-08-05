import React, { useSyncExternalStore, useCallback } from 'react'
import { StyleProp, ViewStyle } from 'react-native'
import { useTheme } from '@/core/theme'
import { ConnectionService, BackendState } from '@/core/connection'
import { triggerGlobalRefresh, useGlobalRefreshingState } from '@/core/cache/useCacheFirst'
import { HeaderIconButton } from './HeaderIconButton'

export interface HeaderRefreshButtonProps {
	onRefresh?: () => void | Promise<void>
	isRefreshing?: boolean
	isOffline?: boolean
	backendState?: BackendState
	size?: number
	style?: StyleProp<ViewStyle>
	disabled?: boolean
}

const subscribeToBackendState = (onStoreChange: () => void): (() => void) => {
	return ConnectionService.subscribe(() => onStoreChange())
}

export function HeaderRefreshButton({ onRefresh, isRefreshing: isRefreshingProp, isOffline = false, backendState: backendStateProp, size, style, disabled = false }: HeaderRefreshButtonProps) {
	const liveBackendState = useSyncExternalStore(subscribeToBackendState, ConnectionService.getBackendState, ConnectionService.getBackendState)
	const globalRefreshing = useGlobalRefreshingState()
	const isRefreshing = isRefreshingProp ?? globalRefreshing

	const backendState = backendStateProp ?? liveBackendState
	const isBackendOffline = backendState === 'offline'
	const isBackendConnecting = backendState === 'connecting'
	const showSpinner = (isRefreshing || isBackendConnecting) && !isBackendOffline
	const showOffline = isBackendOffline || (isOffline && backendState !== 'online')
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
		<HeaderIconButton
			icon={icon}
			iconType={iconType}
			label={showOffline ? 'Offline' : 'Refresh'}
			onPress={handleRefresh}
			disabled={isDisabled}
			loading={showSpinner}
			iconColor={iconColor}
			size={size}
			style={style}
		/>
	)
}

export default HeaderRefreshButton
