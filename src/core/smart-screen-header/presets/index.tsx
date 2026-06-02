import React, { useRef, useEffect } from 'react'
import { Animated, Easing, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '@/core/theme'
import ActionButton from '../components/ActionButton'

// --- REUSABLE REFRESH ACTION ---
export interface RefreshActionProps {
	onRefresh: () => void | Promise<void>
	isRefreshing: boolean
	color?: string
	size?: number
}

export const RefreshAction: React.FC<RefreshActionProps> = React.memo(({ onRefresh, isRefreshing, color, size = 38 }) => {
	const { colors } = useTheme()
	const rotationValue = useRef(new Animated.Value(0)).current

	useEffect(() => {
		let animation: Animated.CompositeAnimation | null = null
		if (isRefreshing) {
			animation = Animated.loop(
				Animated.timing(rotationValue, {
					toValue: 1,
					duration: 1000,
					easing: Easing.linear,
					useNativeDriver: true
				})
			)
			animation.start()
		} else {
			Animated.timing(rotationValue, {
				toValue: 0,
				duration: 300,
				easing: Easing.out(Easing.ease),
				useNativeDriver: true
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

	const handlePress = async () => {
		if (isRefreshing) return

		// Instant small spin on tap before callback finishes
		Animated.timing(rotationValue, {
			toValue: 1,
			duration: 400,
			easing: Easing.bezier(0.25, 1, 0.5, 1),
			useNativeDriver: true
		}).start(() => {
			if (!isRefreshing) {
				rotationValue.setValue(0)
			}
		})

		await onRefresh()
	}

	return (
		<Animated.View style={{ transform: [{ rotate: spin }] }}>
			<ActionButton iconName="refresh" iconType="material" onPress={handlePress} iconColor={color || colors.primary} size={size} disabled={isRefreshing} accessibilityLabel="Refresh current page" />
		</Animated.View>
	)
})

// --- REUSABLE SEARCH ACTION ---
export interface SearchActionProps {
	onPress?: () => void
	color?: string
	size?: number
}

export const SearchAction: React.FC<SearchActionProps> = React.memo(({ onPress, color, size = 38 }) => {
	const router = useRouter()
	const { colors } = useTheme()

	const handlePress = () => {
		if (onPress) {
			onPress()
		} else {
			router.push('/search')
		}
	}

	return <ActionButton iconName="search" iconType="ionicons" onPress={handlePress} iconColor={color || colors.text} size={size} accessibilityLabel="Open search panel" />
})

// --- REUSABLE SETTINGS ACTION ---
export interface SettingsActionProps {
	onPress?: () => void
	color?: string
	size?: number
}

export const SettingsAction: React.FC<SettingsActionProps> = React.memo(({ onPress, color, size = 38 }) => {
	const router = useRouter()
	const { colors } = useTheme()

	const handlePress = () => {
		if (onPress) {
			onPress()
		} else {
			router.push('/settings')
		}
	}

	return <ActionButton iconName="settings-outline" iconType="ionicons" onPress={handlePress} iconColor={color || colors.textSecondary} size={size} accessibilityLabel="Open settings page" />
})

// --- REUSABLE CART ACTION ---
export interface CartActionProps {
	badgeCount?: number
	onPress?: () => void
	color?: string
	size?: number
}

export const CartAction: React.FC<CartActionProps> = React.memo(({ badgeCount = 0, onPress, color, size = 38 }) => {
	const router = useRouter()
	const { colors } = useTheme()

	const handlePress = () => {
		if (onPress) {
			onPress()
		} else {
			// standard cart path in the app
			router.push('/profile/purchases?status=cart')
		}
	}

	return (
		<ActionButton
			iconName="cart-outline"
			iconType="ionicons"
			onPress={handlePress}
			iconColor={color || colors.primary}
			badgeCount={badgeCount}
			size={size}
			accessibilityLabel={`View shopping cart with ${badgeCount} items`}
		/>
	)
})
