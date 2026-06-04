import React, { createContext, useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

let useAudioPlayer: any = null
try {
	useAudioPlayer = require('expo-audio').useAudioPlayer
} catch (e) {
	console.warn('expo-audio module not available')
}

export interface ToastOptions {
	title: string
	message: string
	color?: string
	timeout?: number
	screen?: string
	onPress?: () => void
}

let showToastRef: ((options: ToastOptions) => void) | null = null

export const toast = {
	show: (options: ToastOptions) => showToastRef?.(options)
}

const ToastContext = createContext({})

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [visible, setVisible] = useState(false)
	const [options, setOptions] = useState<ToastOptions | null>(null)
	const translateY = useRef(new Animated.Value(-100)).current
	const opacity = useRef(new Animated.Value(0)).current
	const router = useRouter()
	const insets = useSafeAreaInsets()
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const player = useAudioPlayer ? useAudioPlayer(require('../../../assets/sounds/notification.mp3')) : null

	const hide = useCallback(() => {
		Animated.parallel([Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }), Animated.timing(translateY, { toValue: -100, duration: 200, useNativeDriver: true })]).start(
			() => {
				setVisible(false)
				setOptions(null)
			}
		)
	}, [opacity, translateY])

	const show = useCallback(
		(newOptions: ToastOptions) => {
			setOptions(newOptions)
			setVisible(true)

			try {
				if (player) {
					player.play()
				}
			} catch (error) {
				console.error('Failed to play toast sound:', error)
			}

			Animated.parallel([Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }), Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true })]).start()

			if (timerRef.current) {
				clearTimeout(timerRef.current)
			}

			timerRef.current = setTimeout(() => {
				hide()
			}, newOptions.timeout || 10000)
		},
		[player, opacity, translateY, hide]
	)

	useEffect(() => {
		showToastRef = show
	}, [show])

	const handlePress = () => {
		if (options?.onPress) {
			options.onPress()
		} else if (options?.screen) {
			router.push(options.screen as any)
		}
		hide()
	}

	return (
		<ToastContext.Provider value={{}}>
			{children}
			{visible && options && (
				<Animated.View style={[styles.container, { opacity, transform: [{ translateY }], top: Math.max(insets.top, 20) + 10, backgroundColor: options.color || '#3B82F6' }]}>
					<TouchableOpacity style={styles.content} onPress={handlePress} activeOpacity={0.8}>
						<View style={styles.textContainer}>
							<Text style={styles.title}>{options.title}</Text>
							{!!options.message && (
								<Text style={styles.message} numberOfLines={2}>
									{options.message}
								</Text>
							)}
						</View>
						<TouchableOpacity onPress={hide} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
							<Ionicons name="close" size={20} color="#FFFFFF" />
						</TouchableOpacity>
					</TouchableOpacity>
				</Animated.View>
			)}
		</ToastContext.Provider>
	)
}

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		left: 16,
		right: 16,
		borderRadius: 12,
		zIndex: 9999,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 5
	},
	content: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16
	},
	textContainer: {
		flex: 1,
		marginRight: 12
	},
	title: {
		color: '#FFFFFF',
		fontWeight: '700',
		fontSize: 15,
		marginBottom: 2
	},
	message: {
		color: '#FFFFFF',
		fontSize: 13,
		opacity: 0.9
	},
	closeBtn: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: 'rgba(255,255,255,0.2)',
		justifyContent: 'center',
		alignItems: 'center'
	}
})
