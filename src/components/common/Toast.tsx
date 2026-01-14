import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
	visible: boolean
	message: string
	type?: ToastType
	duration?: number
	onHide: () => void
	onRetry?: () => void
}

export default function Toast({ visible, message, type = 'info', duration = 4000, onHide, onRetry }: ToastProps) {
	const { colors } = useTheme()
	const translateY = useRef(new Animated.Value(-100)).current
	const opacity = useRef(new Animated.Value(0)).current

	useEffect(() => {
		if (visible) {
			// Show animation
			Animated.parallel([
				Animated.timing(translateY, {
					toValue: 0,
					duration: 300,
					useNativeDriver: true
				}),
				Animated.timing(opacity, {
					toValue: 1,
					duration: 300,
					useNativeDriver: true
				})
			]).start()

			// Auto hide after duration
			const timer = setTimeout(() => {
				hideToast()
			}, duration)

			return () => clearTimeout(timer)
		} else {
			hideToast()
		}
	}, [visible])

	const hideToast = () => {
		Animated.parallel([
			Animated.timing(translateY, {
				toValue: -100,
				duration: 300,
				useNativeDriver: true
			}),
			Animated.timing(opacity, {
				toValue: 0,
				duration: 300,
				useNativeDriver: true
			})
		]).start(() => {
			onHide()
		})
	}

	const getIconName = (): keyof typeof Ionicons.glyphMap => {
		switch (type) {
			case 'success':
				return 'checkmark-circle'
			case 'error':
				return 'alert-circle'
			case 'warning':
				return 'warning'
			case 'info':
			default:
				return 'information-circle'
		}
	}

	const getBackgroundColor = () => {
		switch (type) {
			case 'success':
				return colors.success
			case 'error':
				return colors.error
			case 'warning':
				return colors.warning
			case 'info':
			default:
				return colors.info
		}
	}

	if (!visible) return null

	return (
		<Animated.View
			style={[
				styles.container,
				{
					transform: [{ translateY }],
					opacity,
					backgroundColor: getBackgroundColor()
				}
			]}
		>
			<View style={styles.content}>
				<Ionicons name={getIconName()} size={22} color="#fff" style={styles.icon} />
				<Text style={styles.message} numberOfLines={2}>
					{message}
				</Text>
				{onRetry && (
					<TouchableOpacity onPress={onRetry} style={styles.retryButton}>
						<Ionicons name="refresh" size={18} color="#fff" />
					</TouchableOpacity>
				)}
				<TouchableOpacity onPress={hideToast} style={styles.closeButton}>
					<Ionicons name="close" size={20} color="#fff" />
				</TouchableOpacity>
			</View>
		</Animated.View>
	)
}

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		top: 50,
		left: 16,
		right: 16,
		borderRadius: 14,
		zIndex: 9999,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.3,
				shadowRadius: 8
			},
			android: {
				elevation: 8
			}
		})
	},
	content: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 14,
		paddingRight: 10,
		gap: 10
	},
	icon: {
		// Icon styling
	},
	message: {
		flex: 1,
		fontSize: 14,
		fontWeight: '600',
		color: '#fff',
		lineHeight: 20
	},
	retryButton: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		justifyContent: 'center',
		alignItems: 'center'
	},
	closeButton: {
		width: 36,
		height: 36,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center'
	}
})
