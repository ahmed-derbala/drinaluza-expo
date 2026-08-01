import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'
import { IconButton } from './buttons/IconButton'

export interface EmptyStateProps {
	/**
	 * Main empty state descriptive title.
	 */
	title?: string
	/**
	 * Secondary context/subtitle.
	 */
	subtitle?: string
	/**
	 * Icon glyph name.
	 */
	iconName?: any
	/**
	 * Icon package family. Defaults to 'ionicons'.
	 */
	iconType?: 'ionicons' | 'material'
	/**
	 * Optional button action label.
	 */
	actionLabel?: string
	/**
	 * Callback triggered when action button is tapped.
	 */
	onActionPress?: () => void
	/**
	 * Optional custom style for container.
	 */
	style?: object
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, subtitle, iconName = 'alert-circle-outline', iconType = 'ionicons', actionLabel, onActionPress, style }) => {
	const { colors } = useTheme()

	const renderIcon = () => {
		if (iconType === 'material') {
			return <MaterialIcons name={iconName} size={48} color={colors.textTertiary} />
		}
		return <Ionicons name={iconName} size={48} color={colors.textTertiary} />
	}

	return (
		<View style={[styles.container, style]}>
			<View style={[styles.iconWrapper, { backgroundColor: colors.surfaceVariant || colors.text + '05' }]}>{renderIcon()}</View>
			{title ? <Text style={[styles.title, { color: colors.text }]}>{title}</Text> : null}
			{subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}

			{actionLabel && onActionPress && <IconButton icon="arrow-forward" label={actionLabel} onPress={onActionPress} variant="primary" colors={colors} />}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 40,
		textAlign: 'center'
	},
	iconWrapper: {
		width: 80,
		height: 80,
		borderRadius: 24,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 20
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		textAlign: 'center',
		marginBottom: 8
	},
	subtitle: {
		fontSize: 14,
		textAlign: 'center',
		marginBottom: 20,
		lineHeight: 20
	}
})

export default React.memo(EmptyState)
