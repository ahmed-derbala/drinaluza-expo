import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, themeColors } from '@theme'
import { BaseCard } from '@cards/BaseCard'
import { config } from '@/config'

const styles = StyleSheet.create({
	card: {
		flex: 1,
		minHeight: 0
		// radius via borderRadius prop; padding/overflow from BaseCard defaults
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14
	},
	iconContainer: {
		width: 48,
		height: 48,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: themeColors.surfaceVariant
	},
	textContainer: {
		flex: 1,
		gap: 4
	},
	value: {
		fontSize: 16,
		fontWeight: '700'
	}
})

export const CurrentVersionCard: React.FC = () => {
	const { colors } = useTheme()

	return (
		<BaseCard borderRadius={20} style={styles.card}>
			<View style={styles.topRow}>
				<View style={styles.iconContainer}>
					<Ionicons name="phone-portrait-outline" size={22} color={colors.textTertiary} />
				</View>
				<View style={styles.textContainer}>
					<Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
						v{config.app.version}
					</Text>
				</View>
			</View>
		</BaseCard>
	)
}

export default CurrentVersionCard
