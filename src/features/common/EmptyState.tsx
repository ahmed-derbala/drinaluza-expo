import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'

export interface EmptyStateProps {
	/**
	 * Main empty state descriptive title.
	 */
	title: string
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
			<Text style={[styles.title, { color: colors.text }]}>{title}</Text>
			{subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}

			{actionLabel && onActionPress && (
				<TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]} onPress={onActionPress} activeOpacity={0.8}>
					<Text style={styles.actionText}>{actionLabel}</Text>
				</TouchableOpacity>
			)}
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
	},
	actionButton: {
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4
	},
	actionText: {
		color: '#fff',
		fontSize: 15,
		fontWeight: '600'
	}
})

export default React.memo(EmptyState)
