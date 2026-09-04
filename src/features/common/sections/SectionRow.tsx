import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'
import { IconBaseButton } from '@/core/ui/buttons/IconBaseButton'

interface SectionRowProps {
	label?: string
	value: string | React.ReactNode
	icon?: any
	iconColor?: string
	onPress?: () => void
	onLongPress?: () => void
	onCopy?: () => void
	isRtl?: boolean
	style?: StyleProp<ViewStyle>
}

export function SectionRow({ label, value, icon, iconColor, onPress, onLongPress, onCopy, isRtl, style }: SectionRowProps) {
	const { colors } = useTheme()

	const Content = (
		<View style={[styles.sectionRow, style]}>
			{icon && (
				<View style={[styles.iconContainer, { backgroundColor: (iconColor || colors.primary) + '15' }]}>
					<Ionicons name={icon} size={20} color={iconColor || colors.primary} />
				</View>
			)}
			<View style={styles.infoContent}>
				{label && <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>}
				{typeof value === 'string' ? <Text style={[styles.infoValue, { color: colors.text }, isRtl && styles.infoValueRtl]}>{value}</Text> : value}
			</View>
			{onCopy && <IconBaseButton icon="copy-outline" label="Copy" onPress={onCopy} style={styles.copyButton} />}
		</View>
	)

	if (onPress || onLongPress) {
		return (
			<TouchableOpacity onPress={onPress} onLongPress={onLongPress} delayLongPress={500}>
				{Content}
			</TouchableOpacity>
		)
	}

	return Content
}

const styles = StyleSheet.create({
	sectionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16
	},
	iconContainer: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 16
	},
	infoContent: {
		flex: 1
	},
	infoLabel: {
		fontSize: 14,
		marginBottom: 2
	},
	infoValue: {
		fontSize: 16,
		fontWeight: '500'
	},
	infoValueRtl: {
		textAlign: 'right'
	},
	copyButton: {
		padding: 8
	}
})
