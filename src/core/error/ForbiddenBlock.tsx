import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, themeColors } from '@theme'
import { translate } from '@translation'
import { HomeButton, AuthButton, UpdatesButton } from '@buttons'

export interface ForbiddenBlockProps {
	/** Optional custom message. Defaults to the access-denied explanation. */
	message?: string
	/** Accessibility label for the icon. */
	accessibilityLabel?: string
}

const ForbiddenBlock: React.FC<ForbiddenBlockProps> = ({ message, accessibilityLabel }) => {
	const { colors } = useTheme()
	const errorColor = colors?.error ?? themeColors.error

	return (
		<View style={styles.container} accessible accessibilityRole="alert" accessibilityLabel={accessibilityLabel ?? translate('forbidden', 'Forbidden')}>
			<View style={[styles.iconContainer, { backgroundColor: errorColor + '15' }]}>
				<Ionicons name="lock-closed-outline" size={56} color={errorColor} />
			</View>

			<Text style={[styles.message, { color: colors?.textSecondary ?? themeColors.textSecondary }]}>
				{message ?? translate('access_denied_message', 'You do not have permission to access this resource.')}
			</Text>

			<View style={styles.actionRow}>
				<HomeButton variant="secondary" />
				<AuthButton variant="primary" />
				<UpdatesButton variant="secondary" />
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
	message: {
		fontSize: 14,
		fontWeight: '500',
		textAlign: 'center'
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

export default React.memo(ForbiddenBlock)
