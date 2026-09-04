import React from 'react'
import { StyleSheet, View, Pressable, Text, type StyleProp, type ViewStyle, type TextStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'
import { IconBaseButton } from '@/core/ui/buttons/IconBaseButton'
import { CancelButton } from '@/core/ui/buttons/CancelButton'

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
	/** Border color. Defaults to the theme border. When `focused` is true, uses the theme focus color (gold). */
	borderColor?: string
	/** Border width. Defaults to 1. */
	borderWidth?: number
	/** When true, card border uses the focus color (gold) to indicate focused/active state. */
	focused?: boolean
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
	/** Content container style override. */
	contentStyle?: StyleProp<ViewStyle>
	/** Optional test ID. */
	testID?: string
	/** Card interaction mode. 'view' is read-only, 'editable' shows an edit trigger, 'edit' shows save/cancel. Defaults to 'view'. */
	mode?: 'view' | 'edit' | 'editable'
	/** Optional title displayed in the header. */
	title?: React.ReactNode
	/** Optional title style. */
	titleStyle?: StyleProp<TextStyle>
	/** Optional icon name displayed before title (Ionicons). */
	iconName?: string
	/** Extra content rendered in the header, before edit/save/cancel controls. */
	headerRight?: React.ReactNode
	/** Edit action for 'editable' mode. */
	onEdit?: () => void
	/** Save action for 'edit' mode. */
	onSave?: () => void
	/** Cancel action for 'edit' mode. */
	onCancel?: () => void
	/** Loading state for the 'edit' mode save action. */
	loading?: boolean
}

function resolveSize(size: CardSize = 'md'): { padding: number; minHeight: number } {
	if (typeof size === 'number') {
		return { padding: size, minHeight: Math.max(80, size * 5) }
	}
	return SIZE_MAP[size] ?? SIZE_MAP.md
}

export function BaseCard({
	children,
	backgroundColor,
	borderColor,
	borderWidth = 1,
	focused = false,
	size = 'md',
	overflow = 'hidden',
	onPress,
	disabled = false,
	activeOpacity = 0.2,
	style,
	contentStyle,
	testID,
	mode = 'view',
	title,
	titleStyle,
	iconName,
	headerRight,
	onEdit,
	onSave,
	onCancel,
	loading = false
}: BaseCardProps) {
	const { colors } = useTheme()
	const { padding, minHeight } = resolveSize(size)
	const borderRadius = BASE_CARD_RADIUS
	const resolvedBackgroundColor = backgroundColor ?? colors.background
	const resolvedBorderColor = focused ? colors.focus : (borderColor ?? colors.border)

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

	const [currentMode, setCurrentMode] = React.useState(mode)
	React.useEffect(() => {
		setCurrentMode(mode)
	}, [mode])

	const isEdit = currentMode === 'edit'
	const isEditable = currentMode === 'editable'
	const showHeader = !!title || !!iconName || !!headerRight || isEdit || isEditable

	const handleEdit = () => {
		onEdit?.()
		setCurrentMode('edit')
	}

	const handleSave = () => {
		onSave?.()
		setCurrentMode('editable')
	}

	const handleCancel = () => {
		onCancel?.()
		setCurrentMode('editable')
	}

	const titleContent = title ? typeof title === 'string' ? <Text style={[styles.title, { color: colors.text }, titleStyle as any]}>{title}</Text> : title : null

	const header = showHeader ? (
		<View style={styles.header}>
			<View style={styles.titleRow}>
				{iconName ? <Ionicons name={iconName as any} size={18} color={colors.primary} style={styles.titleIcon} /> : null}
				{titleContent}
			</View>
			<View style={styles.actions}>
				{headerRight}
				{isEditable ? <IconBaseButton icon="create-outline" label="Edit" onPress={handleEdit} style={styles.iconButton} /> : null}
				{isEdit ? (
					<>
						<CancelButton onPress={handleCancel} style={styles.iconButton} />
						<IconBaseButton icon="checkmark-circle" label="Save" onPress={handleSave} variant="success" disabled={loading} loading={loading} style={styles.iconButton} />
					</>
				) : null}
			</View>
		</View>
	) : null

	const cardContent = (
		<>
			{header}
			<View style={[styles.content, contentStyle]}>{children}</View>
		</>
	)

	if (onPress && !showHeader) {
		return (
			<Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [cardStyles, { opacity: pressed ? activeOpacity : 1 }]} testID={testID} accessibilityRole="button">
				{cardContent}
			</Pressable>
		)
	}

	return (
		<View style={cardStyles} testID={testID}>
			{cardContent}
		</View>
	)
}

const styles = StyleSheet.create({
	baseCard: {
		width: '100%'
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
		flex: 1,
		marginRight: 12
	},
	titleIcon: {
		marginRight: 8
	},
	title: {
		fontSize: 16,
		fontWeight: '600'
	},
	actions: {
		flexDirection: 'row',
		gap: 8,
		alignItems: 'center'
	},
	iconButton: {
		padding: 4
	},
	content: {}
})
