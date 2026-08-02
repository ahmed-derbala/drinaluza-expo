import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, colors as themeColors } from '@/core/theme'
import { IconButton, type IconVariant } from '../buttons/IconButton'
import { CancelButton } from '../buttons/CancelButton'

interface EditableSectionProps {
	title: React.ReactNode
	children: React.ReactNode
	isEditing?: boolean
	onEdit?: () => void
	onSave?: () => void
	onCancel?: () => void
	iconName?: any
	/** Extra content rendered in the header, before the edit/save/cancel controls (e.g. a GPS button, a badge). */
	headerRight?: React.ReactNode
	style?: StyleProp<ViewStyle>
	contentStyle?: StyleProp<ViewStyle>
	titleStyle?: StyleProp<TextStyle>
	testID?: string
}

export function EditableSection({ title, children, isEditing, onEdit, onSave, onCancel, iconName, headerRight, style, contentStyle, titleStyle, testID }: EditableSectionProps) {
	const { colors } = useTheme()

	return (
		<View style={[styles.section, { backgroundColor: colors.background, borderColor: colors.info }, style]} testID={testID}>
			<View style={styles.header}>
				<View style={styles.titleRow}>
					{iconName && <Ionicons name={iconName} size={18} color={colors.primary} style={styles.titleIcon} />}
					{typeof title === 'string' ? <Text style={[styles.title, { color: colors.text }, titleStyle]}>{title}</Text> : title}
				</View>
				<View style={styles.actions}>
					{headerRight}
					{onEdit && !isEditing && <IconButton icon="create-outline" label="Edit" onPress={onEdit} colors={colors} style={styles.iconButton} />}
					{isEditing && (
						<>
							{onCancel && <CancelButton onPress={onCancel} style={styles.iconButton} />}
							{onSave && <IconButton icon="checkmark-circle" label="Save" onPress={onSave} variant="success" colors={colors} style={styles.iconButton} />}
						</>
					)}
				</View>
			</View>
			<View style={[styles.content, contentStyle]}>{children}</View>
		</View>
	)
}

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
