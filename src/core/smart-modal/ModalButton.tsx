import React, { useMemo } from 'react'
import { Pressable, Text, StyleSheet, ActivityIndicator, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { SmartModalButton } from './types'

interface ModalButtonProps extends SmartModalButton {
	defaultColor: string
	contrastColor?: string
}

export default function ModalButton({
	text,
	onPress,
	variant = 'filled',
	color,
	icon,
	iconPosition = 'left',
	disabled = false,
	loading = false,
	style,
	textStyle,
	testID,
	accessibilityLabel,
	defaultColor,
	contrastColor = '#FFFFFF'
}: ModalButtonProps) {
	const accentColor = color || defaultColor

	const isIconOnly = !text && !!icon

	const containerStyles = useMemo(() => {
		const base = [styles.button, isIconOnly ? styles.iconOnly : { minWidth: 120 }, style]
		if (disabled || loading) base.push(styles.disabled)

		switch (variant) {
			case 'filled':
				base.push({ backgroundColor: accentColor })
				break
			case 'outlined':
				base.push(styles.outlined, { borderColor: accentColor })
				break
			case 'ghost':
				base.push(styles.ghost)
				break
		}

		return base
	}, [accentColor, variant, disabled, loading, style])

	const labelStyles = useMemo(() => {
		const base = [styles.text, textStyle]
		switch (variant) {
			case 'filled':
				base.push({ color: contrastColor })
				break
			case 'outlined':
			case 'ghost':
				base.push({ color: accentColor })
				break
		}
		return base
	}, [accentColor, variant, textStyle, contrastColor])

	const renderIcon = (tint: string) => {
		if (loading) {
			return <ActivityIndicator size="small" color={tint} />
		}
		if (!icon) return null
		return <Ionicons name={icon} size={18} color={tint} />
	}

	const tint = variant === 'filled' ? contrastColor : accentColor

	return (
		<Pressable
			onPress={onPress}
			disabled={disabled || loading}
			style={containerStyles}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel || text || 'Button'}
			accessibilityState={{ disabled, busy: loading }}
			testID={testID}
		>
			<View style={[styles.inner, iconPosition === 'right' && styles.innerReversed, isIconOnly && styles.innerIconOnly]}>
				{renderIcon(tint)}
				{text ? (
					<Text style={labelStyles} numberOfLines={1}>
						{text}
					</Text>
				) : null}
			</View>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	button: {
		borderRadius: 12,
		minHeight: 48,
		justifyContent: 'center',
		paddingHorizontal: 20,
		flex: 1
	},
	iconOnly: {
		minWidth: 48,
		paddingHorizontal: 0
	},
	disabled: {
		opacity: 0.5
	},
	outlined: {
		borderWidth: 1.5,
		backgroundColor: 'transparent'
	},
	ghost: {
		backgroundColor: 'transparent'
	},
	inner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8
	},
	innerReversed: {
		flexDirection: 'row-reverse'
	},
	innerIconOnly: {
		gap: 0
	},
	text: {
		fontSize: 16,
		fontWeight: '600',
		textAlign: 'center'
	}
})
