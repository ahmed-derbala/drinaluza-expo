import React, { useSyncExternalStore, useCallback } from 'react'
import { StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { IconButton } from '@/features/common/buttons/IconButton'
import { useTheme } from '@/core/theme'
import { ConnectionService, BackendState } from '@/core/connection'
import { triggerGlobalRefresh, useGlobalRefreshingState } from '@/core/cache/useCacheFirst'

export interface HeaderRefreshButtonProps {
	/**
	 * Optional callback function triggered when the button is pressed.
	 * If not provided, it triggers a global refresh for all active/mounted cache queries.
	 */
	onRefresh?: () => void | Promise<void>
	/**
	 * Optional boolean indicating whether the refreshing state is active.
	 * If not provided, it tracks the global refreshing state of active cache queries.
	 */
	isRefreshing?: boolean
	/**
	 * Boolean indicating whether the device is offline/last sync failed.
	 * When true (and not refreshing), the button shows a static red cloud-offline icon.
	 */
	isOffline?: boolean
	/**
	 * Global backend availability state.
	 * 'offline' shows a red cloud-offline icon, 'connecting' keeps the refresh icon spinning.
	 */
	backendState?: BackendState
	/**
	 * Optional custom size for the refresh icon.
	 * Defaults to 40.
	 */
	size?: number
	/**
	 * Optional custom style for the container.
	 */
	style?: StyleProp<ViewStyle>
	/**
	 * Optional boolean indicating whether the button is disabled.
	 */
	disabled?: boolean
}

/**
 * Adapter for useSyncExternalStore — ConnectionService.subscribe passes
 * the state to its callback, but useSyncExternalStore expects a
 * parameterless onStoreChange callback.
 */
const subscribeToBackendState = (onStoreChange: () => void): (() => void) => {
	return ConnectionService.subscribe(() => onStoreChange())
}

const HeaderRefreshButton: React.FC<HeaderRefreshButtonProps> = ({
	onRefresh,
	isRefreshing: isRefreshingProp,
	isOffline = false,
	backendState: backendStateProp,
	size = 40,
	style,
	disabled = false
}) => {
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
		<IconButton
			icon={icon}
			iconType={iconType}
			label={showOffline ? 'Offline' : 'Refresh'}
			onPress={handleRefresh}
			disabled={isDisabled}
			loading={showSpinner}
			colors={colors}
			iconColor={iconColor}
			size={size}
			style={[styles.refreshButton, { backgroundColor: colors.primary + '15', borderColor: 'transparent' }, style]}
		/>
	)
}

const styles = StyleSheet.create({
	refreshButton: {}
})

export default HeaderRefreshButton
