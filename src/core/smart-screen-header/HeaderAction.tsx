import React, { useRef, useState } from 'react'
import { Pressable, Animated, StyleSheet, View, Text, Platform } from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'

export interface HeaderActionProps {
	/**
	 * Glyph name of the icon.
	 */
	iconName: any
	/**
	 * Icon glyph package family. Defaults to 'ionicons'.
	 */
	iconType?: 'ionicons' | 'material'
	/**
	 * Action triggered on press.
	 */
	onPress: () => void
	/**
	 * Optional badge count display.
	 */
	badgeCount?: number
	/**
	 * Custom background color when active/default. Defaults to transparent.
	 */
	backgroundColor?: string
	/**
	 * Icon color. Defaults to `colors.primary`.
	 */
	iconColor?: string
	/**
	 * Accessibility string describing the action.
	 */
	accessibilityLabel: string
	/**
	 * Custom container size. Defaults to 44 to meet touch targets.
	 */
	size?: number
	/**
	 * Disabled state.
	 */
	disabled?: boolean
}

const HeaderAction: React.FC<HeaderActionProps> = ({ iconName, iconType = 'ionicons', onPress, badgeCount = 0, backgroundColor, iconColor, accessibilityLabel, size = 44, disabled = false }) => {
	const { colors } = useTheme()
	const [isFocused, setIsFocused] = useState(false)
	const scaleValue = useRef(new Animated.Value(1)).current

	const handlePress = () => {
		if (disabled) return

		// Tactile Spring Scaling Animation
		Animated.sequence([
			Animated.timing(scaleValue, {
				toValue: 0.85,
				duration: 80,
				useNativeDriver: true
			}),
			Animated.spring(scaleValue, {
				toValue: 1,
				friction: 4,
				tension: 40,
				useNativeDriver: true
			})
		]).start()

		onPress()
	}

	const renderIcon = () => {
		const finalColor = disabled ? colors.textSecondary : iconColor || colors.primary
		const iconSize = Math.round(size * 0.5)

		if (iconType === 'material') {
			return <MaterialIcons name={iconName} size={iconSize} color={finalColor} />
		}
		return <Ionicons name={iconName} size={iconSize} color={finalColor} />
	}

	const radius = Math.round(size / 2)

	return (
		<Pressable
			onPress={handlePress}
			disabled={disabled}
			focusable={!disabled}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ disabled }}
			onFocus={() => Platform.OS === 'web' && setIsFocused(true)}
			onBlur={() => Platform.OS === 'web' && setIsFocused(false)}
			style={({ pressed, hovered }) => [
				styles.button,
				{
					width: size,
					height: size,
					borderRadius: radius,
					backgroundColor: backgroundColor
						? backgroundColor
						: hovered && Platform.OS === 'web'
							? colors.borderLight || 'rgba(255, 255, 255, 0.05)'
							: pressed
								? colors.border || 'rgba(255, 255, 255, 0.1)'
								: 'transparent'
				},
				isFocused && styles.focused,
				disabled && styles.disabled
			]}
		>
			<Animated.View style={[styles.innerContainer, { transform: [{ scale: scaleValue }] }]}>
				{renderIcon()}

				{/* Badge Count Overlay */}
				{badgeCount > 0 && (
					<View
						style={[
							styles.badge,
							{
								backgroundColor: colors.error || '#EF4444',
								borderColor: colors.card || '#1C2541',
								top: Math.round(size * 0.05),
								right: Math.round(size * 0.05)
							}
						]}
					>
						<Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
					</View>
				)}
			</Animated.View>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	button: {
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
	innerContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		width: '100%',
		height: '100%',
		position: 'relative'
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
	},
	badge: {
		position: 'absolute',
		borderRadius: 9,
		minWidth: 18,
		height: 18,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 4,
		borderWidth: 1.5
	},
	badgeText: {
		color: '#FFFFFF',
		fontSize: 8,
		fontWeight: 'bold',
		textAlign: 'center'
	}
})

export default React.memo(HeaderAction)
