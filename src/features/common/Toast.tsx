import { themeColors } from '@/core/theme'
import React, { createContext, useState, useEffect, useCallback, useRef } from 'react'
import { TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_MARGIN } from '@/core/contexts/LayoutContext'
import NotificationContentBlock from '@/features/common/blocks/NotificationContentBlock'

let useAudioPlayer: any = null
try {
	useAudioPlayer = require('expo-audio').useAudioPlayer
} catch (e) {
	console.warn('expo-audio module not available')
}

export interface ToastOptions {
	title: string
	content: string
	imageUrl?: string
	/** Border color for the toast. */
	borderColor?: string
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
	const translateY = useRef(new Animated.Value(100)).current
	const opacity = useRef(new Animated.Value(0)).current
	const router = useRouter()
	const insets = useSafeAreaInsets()
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const player = useAudioPlayer ? useAudioPlayer(require('../../../assets/sounds/notification.mp3')) : null

	const hide = useCallback(() => {
		Animated.parallel([
			Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
			Animated.timing(translateY, { toValue: 100, duration: 200, useNativeDriver: Platform.OS !== 'web' })
		]).start(() => {
			setVisible(false)
			setOptions(null)
		})
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

			Animated.parallel([
				Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
				Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' })
			]).start()

			if (timerRef.current) {
				clearTimeout(timerRef.current)
			}

			timerRef.current = setTimeout(() => {
				hide()
			}, newOptions.timeout || 30000)
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

	const borderColor = options?.borderColor || themeColors.info

	return (
		<ToastContext.Provider value={{}}>
			{children}
			{visible && options && (
				<Animated.View
					style={[
						styles.container,
						{
							opacity,
							transform: [{ translateY }],
							bottom: TAB_BAR_BOTTOM_MARGIN + insets.bottom + TAB_BAR_HEIGHT + 10,
							backgroundColor: themeColors.surface,
							borderColor
						}
					]}
				>
					<TouchableOpacity style={styles.content} onPress={handlePress} activeOpacity={0.8}>
						<NotificationContentBlock imageUrl={options.imageUrl} title={options.title} content={options.content || undefined} />
						<TouchableOpacity onPress={hide} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
							<Ionicons name="close" size={20} color={themeColors.textSecondary} />
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
		borderRadius: 24,
		borderWidth: 3,
		zIndex: 9999
	},
	content: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		gap: 12
	},
	closeBtn: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: themeColors.surfaceVariant,
		justifyContent: 'center',
		alignItems: 'center'
	}
})
