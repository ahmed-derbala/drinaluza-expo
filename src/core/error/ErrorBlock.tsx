import React from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, themeColors } from '@/core/theme'
import { translate } from '@/core/translation'
import { HomeButton } from '@/features/common/buttons/HomeButton'
import { UpdatesButton } from '@/features/common/buttons/UpdatesButton'

export interface ErrorBlockProps {
	/** When provided, tapping the icon retries the failed action. */
	onRetry?: () => void
	/** Optional error for display/logging; not rendered as raw text to keep UI consistent. */
	error?: Error | string | null
	/** Accessibility label for the icon. */
	accessibilityLabel?: string
}

const ErrorBlock: React.FC<ErrorBlockProps> = ({ onRetry, accessibilityLabel }) => {
	const { colors } = useTheme()

	const iconEl = (
		<View style={[styles.iconContainer, { backgroundColor: (colors?.error ?? themeColors.error) + '15' }]}>
			<Ionicons name="alert-circle-outline" size={56} color={colors?.error ?? themeColors.error} />
		</View>
	)

	return (
		<View style={styles.container} accessible accessibilityRole="alert" accessibilityLabel={accessibilityLabel ?? translate('error', 'Error')}>
			{onRetry ? (
				<Pressable onPress={onRetry} hitSlop={12} accessibilityLabel={translate('retry', 'Retry')} accessibilityRole="button">
					{iconEl}
				</Pressable>
			) : (
				iconEl
			)}

			<View style={styles.actionRow}>
				<HomeButton variant="secondary" />
				<UpdatesButton variant="primary" />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 40,
		gap: 24
	},
	iconContainer: {
		width: 110,
		height: 110,
		borderRadius: 28,
		justifyContent: 'center',
		alignItems: 'center'
	},
	actionRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		flexWrap: 'wrap',
		gap: 12,
		marginTop: 8
	}
})

export default React.memo(ErrorBlock)
