import React from 'react'
import { StyleSheet, View, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '@/core/theme'

export type CardSize = 'sm' | 'md' | 'lg' | number

const BASE_CARD_RADIUS = 16

const SIZE_MAP: Record<'sm' | 'md' | 'lg', { padding: number; minHeight: number }> = {
	sm: { padding: 8, minHeight: 80 },
	md: { padding: 16, minHeight: 120 },
	lg: { padding: 22, minHeight: 160 }
}

export interface BaseCardProps {
	/** Card content. */
	children: React.ReactNode
	/** Background color. Defaults to the theme background. */
	backgroundColor?: string
	/** Border color. Defaults to the theme border. */
	borderColor?: string
	/** Border width. Defaults to 1. */
	borderWidth?: number
	/** Card size preset or custom padding value. Defaults to 'md'. */
	size?: CardSize
	/** Overflow behavior. Defaults to 'hidden'. */
	overflow?: 'hidden' | 'visible'
	/** Press handler. When provided, the card is rendered as a TouchableOpacity. */
	onPress?: () => void
	/** Disables the pressable card. */
	disabled?: boolean
	/** Active opacity for pressable cards. Defaults to 0.2. */
	activeOpacity?: number
	/** Optional container style override. */
	style?: StyleProp<ViewStyle>
	/** Optional test ID. */
	testID?: string
}

function resolveSize(size: CardSize = 'md'): { padding: number; minHeight: number } {
	if (typeof size === 'number') {
		return { padding: size, minHeight: Math.max(80, size * 5) }
	}
	return SIZE_MAP[size] ?? SIZE_MAP.md
}

export function BaseCard({ children, backgroundColor, borderColor, borderWidth = 1, size = 'md', overflow = 'hidden', onPress, disabled = false, activeOpacity = 0.2, style, testID }: BaseCardProps) {
	const { colors } = useTheme()
	const { padding, minHeight } = resolveSize(size)
	const borderRadius = BASE_CARD_RADIUS
	const resolvedBackgroundColor = backgroundColor ?? colors.background
	const resolvedBorderColor = borderColor ?? colors.border

	const computedStyle: ViewStyle = {
		backgroundColor: resolvedBackgroundColor,
		borderColor: resolvedBorderColor,
		borderWidth,
		borderRadius,
		padding,
		minHeight,
		overflow
	}

	const cardStyles = [styles.baseCard, computedStyle, style]

	if (onPress) {
		return (
			<TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={activeOpacity} style={cardStyles} testID={testID} accessibilityRole="button">
				{children}
			</TouchableOpacity>
		)
	}

	return (
		<View style={cardStyles} testID={testID}>
			{children}
		</View>
	)
}

const styles = StyleSheet.create({
	baseCard: {
		width: '100%'
	}
})
