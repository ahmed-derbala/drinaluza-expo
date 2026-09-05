/**
 * BaseCard — shared foundation for all cards.
 *
 * Purpose: reduce duplicate code across cards. A card focuses on its own
 * logic only; BaseCard handles the standard/shared logic (background,
 * border, radius, padding/size, overflow, pressable, header/edit modes).
 *
 * Convention: if a card does not provide e.g. a border color, the BaseCard
 * default (theme border, or theme focus color when `focused`) is used.
 * Only pass explicit values to override the standard defaults.
 */
import React from 'react'
import { StyleSheet, View, Pressable, Text, type StyleProp, type ViewStyle, type TextStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@theme'
import { EditButton } from '@buttons'

export type CardSize = 'sm' | 'md' | 'lg' | number

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
	/** Border radius. Defaults to 16. */
	borderRadius?: number
	/** When true, card border uses the focus color (gold) to indicate focused/active state. */
	focused?: boolean
	/** Card size preset or custom padding value. Defaults to 'md'. */
	size?: CardSize
	/** Overflow behavior. Defaults to 'hidden'. */
	overflow?: 'hidden' | 'visible'
	/** Press handler. When provided (and no header is shown), the card is rendered as a Pressable. Note: ignored when a header is shown (title/icon/headerRight/edit modes) to avoid nested-press conflicts with header actions. */
	onPress?: () => void
	/** Disables the pressable card. */
	disabled?: boolean
	/** Active opacity for pressable cards. Defaults to 0.7. */
	activeOpacity?: number
	/** Optional container style override. */
	style?: StyleProp<ViewStyle>
	/** Content container style override. */
	contentStyle?: StyleProp<ViewStyle>
	/** Optional test ID. */
	testID?: string
	/** Card interaction mode. 'view' is read-only, 'edit' shows an edit trigger, 'form' serves as a form with no action buttons (save is handled by another button on the screen, e.g. via headerRight). Defaults to 'view'. */
	mode?: 'view' | 'edit' | 'form'
	/** Optional title displayed in the header. */
	title?: React.ReactNode
	/** Optional title style. */
	titleStyle?: StyleProp<TextStyle>
	/** Optional icon name displayed before title (Ionicons). */
	iconName?: React.ComponentProps<typeof Ionicons>['name']
	/** Extra content rendered in the header, before edit/save/cancel controls. */
	headerRight?: React.ReactNode
	/** Edit action for 'edit' mode. The card is fully controlled: activating the form and saving are owned by the caller. */
	onEdit?: () => void
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
	borderRadius: borderRadiusProp,
	focused = false,
	size = 'md',
	overflow = 'hidden',
	onPress,
	disabled = false,
	activeOpacity = 0.7,
	style,
	contentStyle,
	testID,
	mode = 'view',
	title,
	titleStyle,
	iconName,
	headerRight,
	onEdit
}: BaseCardProps) {
	const { colors } = useTheme()
	const { padding, minHeight } = resolveSize(size)
	const borderRadius = borderRadiusProp ?? 16
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

	const isForm = mode === 'form'
	const isEdit = mode === 'edit'
	const showHeader = !!title || !!iconName || !!headerRight || isForm || isEdit

	const handleEdit = () => {
		onEdit?.()
	}

	const titleContent = title ? typeof title === 'string' ? <Text style={[styles.title, { color: colors.text }, titleStyle]}>{title}</Text> : title : null

	const header = showHeader ? (
		<View style={styles.header}>
			<View style={styles.titleRow}>
				{iconName ? <Ionicons name={iconName} size={18} color={colors.primary} style={styles.titleIcon} /> : null}
				{titleContent}
			</View>
			<View style={styles.actions}>
				{headerRight}
				{isEdit ? <EditButton onPress={handleEdit} style={styles.iconButton} /> : null}
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
