import React, { useRef, useEffect } from 'react'
import { TouchableOpacity, Animated, Easing, StyleSheet, Platform, StyleProp, ViewStyle } from 'react-native'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'

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

const HeaderRefreshButton: React.FC<HeaderRefreshButtonProps> = ({ onRefresh, isRefreshing = false, isOffline = false, color, offlineColor, size = 22, style, disabled = false }) => {
	const { colors } = useTheme()
	const rotationValue = useRef(new Animated.Value(0)).current
	const scaleValue = useRef(new Animated.Value(1)).current

	useEffect(() => {
		let animation: Animated.CompositeAnimation | null = null
		if (isRefreshing) {
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
	}, [isRefreshing, rotationValue])

	const spin = rotationValue.interpolate({
		inputRange: [0, 1],
		outputRange: ['0deg', '360deg']
	})

	const handleRefresh = async () => {
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
	}

	if (!onRefresh) return null

	const isDisabled = isRefreshing || disabled

	const renderIcon = () => {
		if (isRefreshing) {
			return (
				<Animated.View style={{ transform: [{ rotate: spin }, { scale: scaleValue }] }}>
					<MaterialIcons name="refresh" size={size} color={color || colors.primary} />
				</Animated.View>
			)
		}

		if (isOffline) {
			return <Ionicons name="cloud-offline" size={size} color={offlineColor || colors.error} />
		}

		return (
			<Animated.View style={{ transform: [{ scale: scaleValue }] }}>
				<MaterialIcons name="refresh" size={size} color={color || colors.primary} />
			</Animated.View>
		)
	}

	return (
		<TouchableOpacity
			style={[styles.refreshButton, { backgroundColor: colors.surface, opacity: isDisabled ? 0.5 : 1 }, style]}
			onPress={handleRefresh}
			disabled={isDisabled}
			hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
			accessibilityRole="button"
			accessibilityLabel={isOffline ? 'Offline' : 'Refresh'}
			accessibilityState={{ disabled: isDisabled }}
		>
			{renderIcon()}
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

export default React.memo(HeaderRefreshButton)
