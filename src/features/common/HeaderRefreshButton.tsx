import React, { useRef, useEffect } from 'react'
import { TouchableOpacity, Animated, Easing, StyleSheet, Platform } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'

export default function HeaderRefreshButton({ onRefresh, isRefreshing = false }: { onRefresh?: () => void | Promise<void>; isRefreshing?: boolean }) {
	const { colors } = useTheme()
	const spinValue = useRef(new Animated.Value(0)).current
	const pressSpinValue = useRef(new Animated.Value(0)).current

	useEffect(() => {
		if (isRefreshing) {
			Animated.loop(
				Animated.timing(spinValue, {
					toValue: 1,
					duration: 1000,
					easing: Easing.linear,
					useNativeDriver: true
				})
			).start()
		} else {
			spinValue.setValue(0)
		}
	}, [isRefreshing, spinValue])

	const spin = spinValue.interpolate({
		inputRange: [0, 1],
		outputRange: ['0deg', '360deg']
	})

	const pressSpin = pressSpinValue.interpolate({
		inputRange: [0, 1],
		outputRange: ['0deg', '180deg']
	})

	const handleRefresh = async () => {
		if (onRefresh && !isRefreshing) {
			Animated.timing(pressSpinValue, {
				toValue: 1,
				duration: 300,
				easing: Easing.out(Easing.ease),
				useNativeDriver: true
			}).start(() => {
				pressSpinValue.setValue(0)
			})
			await onRefresh()
		}
	}

	if (!onRefresh) return null

	return (
		<TouchableOpacity style={[styles.refreshButton, { backgroundColor: colors.surface }]} onPress={handleRefresh} disabled={isRefreshing} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
			<Animated.View style={{ transform: [{ rotate: isRefreshing ? spin : pressSpin }] }}>
				<MaterialIcons name="refresh" size={22} color={colors.primary} />
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
