import React, { useRef, useEffect, useSyncExternalStore, useCallback } from 'react'
import { TouchableOpacity, Animated, Easing, StyleSheet, Platform, StyleProp, ViewStyle } from 'react-native'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'
import { ConnectionService, BackendState } from '@/core/connection'

export interface HeaderRefreshButtonProps {
	/**
	 * Callback function triggered when the button is pressed.
	 * Can be asynchronous.
	 */
	onRefresh: () => void | Promise<void>
	/**
	 * Boolean indicating whether the refreshing state is active.
	 * When true, the button shows a spinning animation and is disabled.
	 */
	isRefreshing: boolean
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
	 * Optional custom color for the refresh icon.
	 * Defaults to `colors.primary`.
	 */
	color?: string
	/**
	 * Optional custom color for the offline icon.
	 * Defaults to `colors.error`.
	 */
	offlineColor?: string
	/**
	 * Optional custom size for the refresh icon.
	 * Defaults to 22.
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
	isRefreshing = false,
	isOffline = false,
	backendState: backendStateProp,
	color,
	offlineColor,
	size = 22,
	style,
	disabled = false
}) => {
	// useSyncExternalStore guarantees synchronous, tear-free reads from
	// ConnectionService on every platform, including Android's Fabric renderer.
	const liveBackendState = useSyncExternalStore(subscribeToBackendState, ConnectionService.getBackendState, ConnectionService.getBackendState)

	const backendState = backendStateProp ?? liveBackendState
	const isBackendOffline = backendState === 'offline'
	const isBackendConnecting = backendState === 'connecting'
	const showSpinner = isRefreshing || isBackendConnecting
	const showOffline = isBackendOffline || (isOffline && backendState !== 'online')
	const { colors } = useTheme()
	const rotationValue = useRef(new Animated.Value(0)).current
	const scaleValue = useRef(new Animated.Value(1)).current

	useEffect(() => {
		let animation: Animated.CompositeAnimation | null = null
		if (showSpinner) {
			animation = Animated.loop(
				Animated.timing(rotationValue, {
					toValue: 1,
					duration: 1000,
					easing: Easing.linear,
					useNativeDriver: Platform.OS !== 'web'
				})
			)
			animation.start()
		} else {
			Animated.timing(rotationValue, {
				toValue: 0,
				duration: 300,
				easing: Easing.out(Easing.ease),
				useNativeDriver: Platform.OS !== 'web'
			}).start()
		}

		return () => {
			if (animation) {
				animation.stop()
			}
		}
	}, [showSpinner, rotationValue])

	const spin = rotationValue.interpolate({
		inputRange: [0, 1],
		outputRange: ['0deg', '360deg']
	})

	const handleRefresh = useCallback(async () => {
		if (onRefresh && !isRefreshing && !disabled) {
			// Trigger spring scale bounce
			Animated.sequence([
				Animated.timing(scaleValue, {
					toValue: 0.85,
					duration: 80,
					useNativeDriver: Platform.OS !== 'web'
				}),
				Animated.spring(scaleValue, {
					toValue: 1,
					friction: 4,
					tension: 40,
					useNativeDriver: Platform.OS !== 'web'
				})
			]).start()

			// Trigger rotation spin on press
			Animated.timing(rotationValue, {
				toValue: 1,
				duration: 500,
				easing: Easing.bezier(0.25, 1, 0.5, 1),
				useNativeDriver: Platform.OS !== 'web'
			}).start(() => {
				if (!isRefreshing) {
					rotationValue.setValue(0)
				}
			})

			await onRefresh()
		}
	}, [onRefresh, isRefreshing, disabled, scaleValue, rotationValue])

	if (!onRefresh) return null

	const isDisabled = showSpinner || disabled

	// Derive a visual mode key so React is forced to reconcile the icon
	// subtree when the button switches between offline / spinning / idle.
	const visualMode = showOffline ? 'offline' : showSpinner ? 'spinning' : 'idle'

	return (
		<TouchableOpacity
			style={[styles.refreshButton, { backgroundColor: colors.surface, opacity: isDisabled ? 0.5 : 1 }, style]}
			onPress={handleRefresh}
			disabled={isDisabled}
			hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
			accessibilityRole="button"
			accessibilityLabel={showOffline ? 'Offline' : 'Refresh'}
			accessibilityState={{ disabled: isDisabled }}
		>
			<Animated.View key={visualMode} style={{ transform: showSpinner ? [{ rotate: spin }, { scale: scaleValue }] : [{ scale: scaleValue }] }}>
				{showOffline ? <Ionicons name="cloud-offline" size={size} color={offlineColor || colors.error} /> : <MaterialIcons name="refresh" size={size} color={color || colors.primary} />}
			</Animated.View>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	refreshButton: {
		width: 36,
		height: 36,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center'
	}
})

export default HeaderRefreshButton
