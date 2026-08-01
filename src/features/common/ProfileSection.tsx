import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, colors as themeColors } from '@/core/theme'
import { IconButton } from './buttons/IconButton'
import { CancelButton } from './buttons/CancelButton'

interface ProfileSectionProps {
	title: string
	children: React.ReactNode
	isEditing?: boolean
	onEdit?: () => void
	onSave?: () => void
	onCancel?: () => void
	iconName?: any
	style?: StyleProp<ViewStyle>
	contentStyle?: StyleProp<ViewStyle>
	titleStyle?: StyleProp<TextStyle>
	testID?: string
}

export function ProfileSection({ title, children, isEditing, onEdit, onSave, onCancel, iconName, style, contentStyle, titleStyle, testID }: ProfileSectionProps) {
	const { colors } = useTheme()

	return (
		<View style={[styles.section, { backgroundColor: colors.background, borderColor: colors.info }, style]} testID={testID}>
			<View style={styles.header}>
				<View style={styles.titleRow}>
					{iconName && <Ionicons name={iconName} size={18} color={colors.primary} style={styles.titleIcon} />}
					<Text style={[styles.title, { color: colors.text }, titleStyle]}>{title}</Text>
				</View>
				{onEdit && !isEditing && <IconButton icon="create-outline" label="Edit" onPress={onEdit} colors={colors} style={styles.iconButton} />}
				{isEditing && (
					<View style={styles.actions}>
						{onCancel && <CancelButton onPress={onCancel} style={styles.iconButton} />}
						{onSave && <IconButton icon="checkmark-circle" label="Save" onPress={onSave} variant="success" colors={colors} style={styles.iconButton} />}
					</View>
				)}
			</View>
			<View style={[styles.content, contentStyle]}>{children}</View>
		</View>
	)
}

interface InfoItemProps {
	label: string
	value: string | React.ReactNode
	icon: any
	iconColor?: string
	onPress?: () => void
	onLongPress?: () => void
	onCopy?: () => void
	style?: StyleProp<ViewStyle>
}

export function InfoItem({ label, value, icon, iconColor, onPress, onLongPress, onCopy, style }: InfoItemProps) {
	const { colors } = useTheme()

	const Content = (
		<View style={[styles.infoItem, style]}>
			<View style={[styles.iconContainer, { backgroundColor: (iconColor || colors.primary) + '15' }]}>
				<Ionicons name={icon} size={20} color={iconColor || colors.primary} />
			</View>
			<View style={styles.infoContent}>
				<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
				{typeof value === 'string' ? <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text> : value}
			</View>
			{onCopy && <IconButton icon="copy-outline" label="Copy" onPress={onCopy} colors={colors} style={styles.copyButton} />}
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
	section: {
		marginBottom: 24,
		borderRadius: 16,
		padding: 16,
		borderWidth: 1
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1
	},
	titleIcon: {
		marginRight: 8
	},
	title: {
		fontSize: 18,
		fontWeight: '600'
	},
	actions: {
		flexDirection: 'row',
		gap: 12
	},
	iconButton: {
		padding: 4
	},
	content: {
		gap: 0
	},
	infoItem: {
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
	copyButton: {
		padding: 8
	}
})
