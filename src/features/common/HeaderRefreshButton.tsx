import React, { useRef, useEffect } from 'react'
import { TouchableOpacity, Animated, Easing, StyleSheet, Platform, StyleProp, ViewStyle } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
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
	 * Optional custom color for the refresh icon.
	 * Defaults to `colors.primary`.
	 */
	color?: string
	/**
	 * Optional custom size for the refresh icon.
	 * Defaults to 22.
	 */
	size?: number
	/**
	 * Optional custom style for the container.
	 */
	style?: StyleProp<ViewStyle>
}

const HeaderRefreshButton: React.FC<HeaderRefreshButtonProps> = ({ onRefresh, isRefreshing = false, color, size = 22, style }) => {
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
		if (onRefresh && !isRefreshing) {
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

	return (
		<TouchableOpacity
			style={[styles.refreshButton, { backgroundColor: colors.surface }, style]}
			onPress={handleRefresh}
			disabled={isRefreshing}
			hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
			accessibilityRole="button"
			accessibilityLabel="Refresh"
			accessibilityState={{ disabled: isRefreshing }}
		>
			<Animated.View style={{ transform: [{ rotate: spin }, { scale: scaleValue }] }}>
				<MaterialIcons name="refresh" size={size} color={color || colors.primary} />
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
		alignItems: 'center',
		marginRight: Platform.OS === 'ios' ? 0 : 8
	}
})

export default React.memo(HeaderRefreshButton)
