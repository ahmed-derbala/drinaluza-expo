import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../core/contexts/ThemeContext'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastAction {
	label: string
	onPress: () => void
	color?: string
	icon?: keyof typeof Ionicons.glyphMap
}

export interface ToastProps {
	visible: boolean
	message: string
	type?: ToastType
	duration?: number
	onHide: () => void
	actions?: ToastAction[]
}

const TAB_BAR_HEIGHT =
	Platform.select({
		ios: 60,
		android: 70,
		web: 70
	}) || 70

export default function Toast({ visible, message, type = 'info', duration = 3000, onHide, actions = [] }: ToastProps) {
	const { colors } = useTheme()
	const translateY = useRef(new Animated.Value(100)).current
	const opacity = useRef(new Animated.Value(0)).current

	useEffect(() => {
		if (visible) {
			Animated.parallel([
				Animated.timing(translateY, {
					toValue: 0,
					duration: 350,
					useNativeDriver: true
				}),
				Animated.timing(opacity, {
					toValue: 1,
					duration: 350,
					useNativeDriver: true
				})
			]).start()

			if (duration > 0) {
				const timer = setTimeout(() => {
					hideToast()
				}, duration)
				return () => clearTimeout(timer)
			}
		} else {
			hideToast()
		}
	}, [visible])

	const hideToast = () => {
		Animated.parallel([
			Animated.timing(translateY, {
				toValue: 20,
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
				return colors.success || '#10B981'
			case 'error':
				return colors.error || '#EF4444'
			case 'warning':
				return colors.warning || '#F59E0B'
			case 'info':
			default:
				return colors.info || '#3B82F6'
		}
	}

	if (!visible && opacity._value === 0) return null

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
				<View style={styles.header}>
					<View style={styles.mainInfo}>
						<Ionicons name={getIconName()} size={24} color="#fff" />
						<Text style={styles.message} numberOfLines={3}>
							{message}
						</Text>
					</View>
					<TouchableOpacity onPress={hideToast} style={styles.closeButton}>
						<Ionicons name="close" size={20} color="#fff" />
					</TouchableOpacity>
				</View>

				{actions.length > 0 && (
					<View style={styles.actionsContainer}>
						{actions.map((action, index) => (
							<TouchableOpacity
								key={index}
								onPress={() => {
									action.onPress()
									hideToast()
								}}
								style={styles.actionButton}
							>
								{action.icon && <Ionicons name={action.icon} size={16} color={action.color || '#fff'} style={{ marginRight: 6 }} />}
								<Text style={[styles.actionLabel, action.color ? { color: action.color } : null]}>{action.label}</Text>
							</TouchableOpacity>
						))}
					</View>
				)}
			</View>
		</Animated.View>
	)
}

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		bottom: TAB_BAR_HEIGHT + 16,
		left: 16,
		right: 16,
		borderRadius: 18,
		zIndex: 10000,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 6 },
				shadowOpacity: 0.35,
				shadowRadius: 12
			},
			android: {
				elevation: 12
			},
			web: {
				boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
				maxWidth: 500,
				alignSelf: 'center',
				left: 'auto',
				right: 'auto',
				width: '90%'
			}
		})
	},
	content: {
		padding: 14,
		gap: 10
	},
	header: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		gap: 12
	},
	mainInfo: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12
	},
	message: {
		flex: 1,
		fontSize: 15,
		fontWeight: '600',
		color: '#fff',
		lineHeight: 20
	},
	closeButton: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: 'rgba(255, 255, 255, 0.15)',
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: -2
	},
	actionsContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-end',
		gap: 10,
		marginTop: 4,
		borderTopWidth: 1,
		borderTopColor: 'rgba(255, 255, 255, 0.2)',
		paddingTop: 10
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 10,
		backgroundColor: 'rgba(255, 255, 255, 0.25)'
	},
	actionLabel: {
		fontSize: 13,
		fontWeight: '700',
		color: '#fff',
		letterSpacing: 0.5
	}
})
