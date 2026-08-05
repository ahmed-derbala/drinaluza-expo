import React from 'react'
import { StyleSheet, View, Text, StyleProp, ViewStyle } from 'react-native'
import { IconButton } from '@/features/common/buttons/IconButton'
import { useTheme, colors as themeColors } from '@/core/theme'

export interface HeaderIconButtonProps {
	icon: any
	iconType?: 'ionicons' | 'material'
	label: string
	onPress: (event?: any) => void
	disabled?: boolean
	loading?: boolean
	iconColor?: string
	badgeCount?: number
	size?: number
	style?: StyleProp<ViewStyle>
}

export function HeaderIconButton({ icon, iconType = 'ionicons', label, onPress, disabled, loading, iconColor, badgeCount = 0, size = 38, style }: HeaderIconButtonProps) {
	const { colors } = useTheme()

	const button = (
		<IconButton
			icon={icon}
			iconType={iconType}
			label={label}
			onPress={onPress}
			disabled={disabled}
			loading={loading}
			colors={colors}
			iconColor={iconColor ?? colors.primary}
			size={size}
			style={[{ backgroundColor: 'transparent', borderColor: 'transparent' }, style]}
		/>
	)

	if (badgeCount <= 0) return button

	return (
		<View style={styles.buttonContainer}>
			{button}
			<View
				style={[
					styles.badge,
					{
						backgroundColor: colors.error,
						borderColor: colors.surface,
						top: -Math.round(size * 0.15),
						right: -Math.round(size * 0.15)
					}
				]}
			>
				<Text style={styles.badgeText}>{badgeCount}</Text>
			</View>
		</View>
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
		color: themeColors.buttonText,
		fontSize: 9,
		fontWeight: 'bold'
	}
})
