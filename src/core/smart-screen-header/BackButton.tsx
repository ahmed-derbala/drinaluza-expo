import React, { useState } from 'react'
import { Pressable, StyleSheet, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useTheme } from '@/core/theme'

export interface BackButtonProps {
	/**
	 * Callback when back button is pressed.
	 * If not provided, it will automatically invoke router.back() if possible.
	 */
	onPress?: () => void
	/**
	 * Custom color override for the icon.
	 */
	color?: string
	/**
	 * Custom size for the icon. Defaults to 24.
	 */
	size?: number
	/**
	 * Optional accessibility label override.
	 */
	accessibilityLabel?: string
	/**
	 * Disabled state.
	 */
	disabled?: boolean
}

export const BackButton: React.FC<BackButtonProps> = ({ onPress, color, size = 24, accessibilityLabel, disabled = false }) => {
	const router = useRouter()
	const { colors } = useTheme()
	const [isFocused, setIsFocused] = useState(false)

	const handlePress = () => {
		if (disabled) return
		if (onPress) {
			onPress()
		} else if (router.canGoBack()) {
			router.back()
		}
	}

	// Platform specific back icon (iOS style vs Android style)
	const iconName = Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'
	const activeColor = color || colors.text
	const activeLabel = accessibilityLabel || 'Go back'

	return (
		<Pressable
			onPress={handlePress}
			disabled={disabled}
			focusable={!disabled}
			accessibilityRole="button"
			accessibilityLabel={activeLabel}
			accessibilityState={{ disabled }}
			onFocus={() => Platform.OS === 'web' && setIsFocused(true)}
			onBlur={() => Platform.OS === 'web' && setIsFocused(false)}
			style={({ pressed, hovered }) => [
				styles.button,
				{
					backgroundColor: hovered && Platform.OS === 'web' ? colors.borderLight || 'rgba(255, 255, 255, 0.05)' : pressed ? colors.border || 'rgba(255, 255, 255, 0.1)' : 'transparent'
				},
				isFocused && styles.focused,
				disabled && styles.disabled
			]}
		>
			<Ionicons name={iconName} size={size} color={disabled ? colors.textSecondary : activeColor} />
		</Pressable>
	)
}

const styles = StyleSheet.create({
	button: {
		width: 44,
		height: 44,
		borderRadius: 22,
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({
			web: {
				outlineStyle: 'none' as any,
				cursor: 'pointer' as any,
				transition: 'background-color 0.2s ease, box-shadow 0.2s ease' as any
			}
		})
	},
	focused: {
		...Platform.select({
			web: {
				boxShadow: '0 0 0 2px #0EA5E9' as any
			}
		})
	},
	disabled: {
		opacity: 0.5,
		...Platform.select({
			web: {
				cursor: 'not-allowed' as any
			}
		})
	}
})
