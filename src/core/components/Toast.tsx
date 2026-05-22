import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { Audio } from 'expo-av'
import { Ionicons } from '@expo/vector-icons'

export interface ToastProps {
	title?: string
	message: string
	color?: string
	timeout?: number
	screen?: string
	visible: boolean
	onClose: () => void
}

export default function Toast({ title, message, color = 'blue', timeout = 10000, screen, visible, onClose }: ToastProps) {
	const router = useRouter()
	const translateY = useRef(new Animated.Value(100)).current
	const opacity = useRef(new Animated.Value(0)).current

	useEffect(() => {
		if (visible) {
			const playSound = async () => {
				try {
					const { sound } = await Audio.Sound.createAsync(require('../../../assets/sounds/toast.wav'))
					await sound.playAsync()
					sound.setOnPlaybackStatusUpdate((status) => {
						if (status.isLoaded && status.didJustFinish) {
							sound.unloadAsync()
						}
					})
				} catch (error) {
					console.log('Error playing toast sound:', error)
				}
			}
			playSound()

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

			if (timeout > 0) {
				const timer = setTimeout(() => {
					hideToast()
				}, timeout)
				return () => clearTimeout(timer)
			}
		} else {
			hideToast()
		}
	}, [visible, timeout])

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
			onClose()
		})
	}

	const handlePress = () => {
		if (screen) {
			router.push(screen as any)
		}
		hideToast()
	}

	if (!visible && opacity._value === 0) return null

	return (
		<Animated.View
			style={[
				styles.container,
				{
					transform: [{ translateY }],
					opacity,
					backgroundColor: color
				}
			]}
		>
			<TouchableOpacity activeOpacity={screen ? 0.8 : 1} onPress={handlePress} style={styles.content}>
				<View style={styles.header}>
					<View style={styles.mainInfo}>
						{title && (
							<Text style={styles.title} numberOfLines={1}>
								{title}
							</Text>
						)}
						<Text style={styles.message} numberOfLines={3}>
							{message}
						</Text>
					</View>
					<TouchableOpacity
						onPress={(e) => {
							e.stopPropagation()
							hideToast()
						}}
						style={styles.closeButton}
					>
						<Ionicons name="close" size={20} color="#fff" />
					</TouchableOpacity>
				</View>
			</TouchableOpacity>
		</Animated.View>
	)
}

const TAB_BAR_HEIGHT =
	Platform.select({
		ios: 60,
		android: 70,
		web: 70
	}) || 70

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
		padding: 16,
		gap: 6
	},
	header: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between'
	},
	mainInfo: {
		flex: 1,
		flexDirection: 'column',
		gap: 6
	},
	title: {
		fontSize: 16,
		fontWeight: '700',
		color: '#fff',
		lineHeight: 22
	},
	message: {
		fontSize: 14,
		fontWeight: '500',
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
		marginTop: -2,
		marginLeft: 12
	}
})
