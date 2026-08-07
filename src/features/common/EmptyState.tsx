import React from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'

export interface EmptyStateProps {
	/**
	 * When provided, tapping the icon triggers this action (e.g. clear filters).
	 */
	onActionPress?: () => void
	/**
	 * Optional custom style for container.
	 */
	style?: object
}

const EmptyState: React.FC<EmptyStateProps> = ({ onActionPress, style }) => {
	const { colors } = useTheme()

	const iconEl = (
		<View style={[styles.iconWrapper, { backgroundColor: colors.surfaceVariant || colors.text + '05' }]}>
			<Ionicons name="cube-outline" size={48} color={colors.textTertiary} />
		</View>
	)

	return (
		<View style={[styles.container, style]}>
			{onActionPress ? (
				<Pressable onPress={onActionPress} hitSlop={12}>
					{iconEl}
				</Pressable>
			) : (
				iconEl
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
		alignItems: 'center'
	}
})

export default React.memo(EmptyState)
