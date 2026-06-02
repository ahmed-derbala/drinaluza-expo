import React, { useRef } from 'react'
import { StyleSheet, Text, View, Animated, Platform, Pressable } from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'
import { SmartScreenHeaderActionButtonProps } from '../types'

const ActionButton: React.FC<SmartScreenHeaderActionButtonProps> = ({
	iconName,
	iconType = 'ionicons',
	onPress,
	badgeCount = 0,
	backgroundColor,
	iconColor,
	accessibilityLabel,
	size = 38,
	disabled = false
}) => {
	const { colors } = useTheme()
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
		const finalColor = iconColor || colors.primary
		const iconSize = Math.round(size * 0.55)

		if (iconType === 'material') {
			return <MaterialIcons name={iconName} size={iconSize} color={finalColor} />
		}
		return <Ionicons name={iconName} size={iconSize} color={finalColor} />
	}

	return (
		<Pressable
			onPress={handlePress}
			disabled={disabled}
			focusable={true}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ disabled }}
			hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
			style={({ hovered }) => [
				styles.pressable,
				{
					width: size,
					height: size,
					borderRadius: Math.round(size * 0.28),
					backgroundColor: disabled ? 'transparent' : hovered ? colors.surfaceVariant : backgroundColor || colors.primary + '12'
				}
			]}
		>
			<Animated.View
				style={[
					styles.animatedContent,
					{
						transform: [{ scale: scaleValue }],
						opacity: disabled ? 0.4 : 1
					}
				]}
			>
				{renderIcon()}

				{/* Optional Notification Badge Overlay */}
				{badgeCount > 0 && !disabled && (
					<View
						style={[
							styles.badge,
							{
								backgroundColor: colors.error || '#EF4444',
								borderColor: colors.surface || '#1C2541',
								top: -Math.round(size * 0.15),
								right: -Math.round(size * 0.15),
								minWidth: Math.round(size * 0.48),
								height: Math.round(size * 0.48),
								borderRadius: Math.round(size * 0.24)
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
	pressable: {
		justifyContent: 'center',
		alignItems: 'center',
		position: 'relative',
		...Platform.select({
			web: {
				cursor: 'pointer',
				outlineStyle: 'none',
				transition: 'background-color 0.2s ease, transform 0.1s ease'
			} as any
		})
	},
	animatedContent: {
		justifyContent: 'center',
		alignItems: 'center',
		width: '100%',
		height: '100%'
	},
	badge: {
		position: 'absolute',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 3,
		borderWidth: 1.5
	},
	badgeText: {
		color: '#FFFFFF',
		fontSize: 9,
		fontWeight: 'bold',
		textAlign: 'center'
	}
})

export default React.memo(ActionButton)
