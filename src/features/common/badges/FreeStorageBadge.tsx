import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle, type TextStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, themeColors } from '@/core/theme'
import { config } from '@/config'

export interface FreeStorageBadgeProps {
	/** Free disk storage in bytes. */
	bytes?: number
	/** Minimum required free storage in GB before showing error color. Defaults to config.updates.minFreeStorageGB. */
	minFreeStorageGB?: number
	/** Whether to display the icon. Defaults to true. */
	showIcon?: boolean
	/** Ionicons icon name. Defaults to 'hardware-chip-outline'. */
	iconName?: React.ComponentProps<typeof Ionicons>['name']
	/** Custom text and icon color. Defaults to themeColors.error if below minFreeStorageGB, otherwise primary. */
	color?: string
	/** Custom background color. Defaults to matching transparent container token. */
	backgroundColor?: string
	/** Custom suffix label after formatted size. Defaults to 'free'. */
	label?: string
	style?: StyleProp<ViewStyle>
	textStyle?: StyleProp<TextStyle>
}

export function formatStorageBytes(bytes: number): string {
	if (!bytes || bytes <= 0) return '0 B'
	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function FreeStorageBadge({ bytes, minFreeStorageGB, showIcon = true, iconName = 'hardware-chip-outline', color, backgroundColor, label = 'free', style, textStyle }: FreeStorageBadgeProps) {
	const { colors } = useTheme()

	if (bytes === undefined || bytes === null || bytes <= 0) {
		return null
	}

	const minRequiredBytes = (minFreeStorageGB ?? config.updates.minFreeStorageGB ?? 1) * 1024 * 1024 * 1024
	const isLowStorage = bytes < minRequiredBytes

	const resolvedColor = color ?? (isLowStorage ? themeColors.error : colors.primary)

	const resolvedBackground = backgroundColor ?? (isLowStorage ? themeColors.error12 : themeColors.primary12)

	return (
		<View style={[styles.badge, { backgroundColor: resolvedBackground }, style]}>
			{showIcon && <Ionicons name={iconName} size={10} color={resolvedColor} />}
			<Text style={[styles.text, { color: resolvedColor }, textStyle]} numberOfLines={1} adjustsFontSizeToFit>
				{formatStorageBytes(bytes)}
				{label ? ` ${label}` : ''}
			</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
		paddingHorizontal: 6,
		paddingVertical: 3,
		borderRadius: 8,
		alignSelf: 'flex-start'
	},
	text: {
		fontSize: 10,
		fontWeight: '600'
	}
})

export default FreeStorageBadge
