import React from 'react'
import { StyleSheet, Platform, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'
import { SmartScreenHeaderBackButtonProps } from '../types'

const BackButton: React.FC<SmartScreenHeaderBackButtonProps> = ({ onPress, color, size = 26, accessibilityLabel = 'Go back' }) => {
	const router = useRouter()
	const { colors } = useTheme()

	const handlePress = () => {
		if (onPress) {
			onPress()
			return
		}

		if (router.canGoBack()) {
			router.back()
		} else {
			// If there's nowhere to go back, fallback safely to /feed
			router.replace('/feed' as any)
		}
	}

	const iconName = Platform.select({
		ios: 'chevron-back',
		android: 'arrow-back',
		web: 'chevron-back',
		default: 'arrow-back'
	}) as any

	return (
		<Pressable
			onPress={handlePress}
			focusable={true}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
			style={({ hovered, pressed }) => [
				styles.container,
				{
					backgroundColor: hovered ? colors.surfaceVariant : 'transparent'
				},
				pressed && styles.pressed
			]}
		>
			<Ionicons name={iconName} size={size} color={color || colors.text} />
		</Pressable>
	)
}

const styles = StyleSheet.create({
	container: {
		width: 38,
		height: 38,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({
			web: {
				cursor: 'pointer',
				outlineStyle: 'none',
				transition: 'background-color 0.2s ease, transform 0.1s ease'
			} as any
		})
	},
	pressed: {
		transform: [{ scale: 0.93 }],
		opacity: 0.8
	}
})

export default React.memo(BackButton)
