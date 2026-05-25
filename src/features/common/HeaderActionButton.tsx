import React, { useRef } from 'react'
import { TouchableOpacity, Animated, StyleSheet, View, Text } from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'

export interface HeaderActionButtonProps {
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
	 * Custom background color. Defaults to HSL theme overlay.
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
	 * Custom container size override. Defaults to 36.
	 */
	size?: number
}

const HeaderActionButton: React.FC<HeaderActionButtonProps> = ({ iconName, iconType = 'ionicons', onPress, badgeCount = 0, backgroundColor, iconColor, accessibilityLabel, size = 36 }) => {
	const { colors } = useTheme()
	const scaleValue = useRef(new Animated.Value(1)).current

	const handlePress = () => {
		// Tactile Spring Scaling
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
		<TouchableOpacity onPress={handlePress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={{ justifyContent: 'center', alignItems: 'center' }}>
			<Animated.View
				style={[
					styles.buttonContainer,
					{
						width: size,
						height: size,
						borderRadius: Math.round(size * 0.28),
						backgroundColor: backgroundColor || colors.primary + '15',
						transform: [{ scale: scaleValue }]
					}
				]}
			>
				{renderIcon()}

				{/* Optional Badge Count Overlay */}
				{badgeCount > 0 && (
					<View
						style={[
							styles.badge,
							{
								backgroundColor: colors.error || '#ef4444',
								borderColor: colors.surface,
								top: -Math.round(size * 0.15),
								right: -Math.round(size * 0.15)
							}
						]}
					>
						<Text style={styles.badgeText}>{badgeCount}</Text>
					</View>
				)}
			</Animated.View>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	buttonContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		position: 'relative'
	},
	badge: {
		position: 'absolute',
		borderRadius: 10,
		minWidth: 18,
		height: 18,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 4,
		borderWidth: 1.5
	},
	badgeText: {
		color: '#fff',
		fontSize: 9,
		fontWeight: 'bold'
	}
})

export default React.memo(HeaderActionButton)
