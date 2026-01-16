import React, { useRef, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Easing } from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface ScreenHeaderProps {
	title?: string
	showBack?: boolean
	onBackPress?: () => void
	rightActions?: React.ReactNode
	subtitle?: string
	transparent?: boolean
	/** Callback to refresh screen data. When provided, shows a refresh icon in the header */
	onRefresh?: () => void | Promise<void>
	/** Whether the refresh is currently in progress */
	isRefreshing?: boolean
}

export default function ScreenHeader({ title, showBack = true, onBackPress, rightActions, subtitle, transparent = false, onRefresh, isRefreshing = false }: ScreenHeaderProps) {
	const { colors } = useTheme()
	const router = useRouter()
	const insets = useSafeAreaInsets()

	// Animation for refresh icon spinning
	const spinValue = useRef(new Animated.Value(0)).current

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

	const handleBackPress = () => {
		if (onBackPress) {
			onBackPress()
		} else if (router.canGoBack()) {
			router.back()
		} else {
			router.replace('/home/feed')
		}
	}

	const handleRefresh = async () => {
		if (onRefresh && !isRefreshing) {
			await onRefresh()
		}
	}

	// Modern blue color for refresh icon
	const refreshIconColor = '#2196F3'

	return (
		<View
			style={[
				styles.container,
				{
					backgroundColor: transparent ? 'transparent' : colors.background,
					borderBottomColor: transparent ? 'transparent' : colors.border,
					paddingTop: insets.top + 8
				}
			]}
		>
			<View style={styles.leftSection}>
				{showBack && (
					<TouchableOpacity style={[styles.backButton, { backgroundColor: colors.surface }]} onPress={handleBackPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
						<MaterialIcons name="arrow-back" size={22} color={colors.text} />
					</TouchableOpacity>
				)}
				{title && (
					<View style={styles.titleContainer}>
						<Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
							{title}
						</Text>
						{subtitle && (
							<Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
								{subtitle}
							</Text>
						)}
					</View>
				)}
			</View>
			<View style={styles.rightSection}>
				{onRefresh && (
					<TouchableOpacity style={[styles.refreshButton, { backgroundColor: colors.surface }]} onPress={handleRefresh} disabled={isRefreshing} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
						<Animated.View style={{ transform: [{ rotate: isRefreshing ? spin : '0deg' }] }}>
							<MaterialIcons name="refresh" size={22} color={refreshIconColor} />
						</Animated.View>
					</TouchableOpacity>
				)}
				{rightActions}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingBottom: 16,
		borderBottomWidth: 1,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.05,
				shadowRadius: 3
			},
			android: {
				elevation: 2
			}
		})
	},
	leftSection: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1
	},
	backButton: {
		width: 44,
		height: 44,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12
	},
	refreshButton: {
		width: 44,
		height: 44,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center'
	},
	titleContainer: {
		flex: 1
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		letterSpacing: -0.3
	},
	subtitle: {
		fontSize: 13,
		marginTop: 2
	},
	rightSection: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginLeft: 12
	}
})
