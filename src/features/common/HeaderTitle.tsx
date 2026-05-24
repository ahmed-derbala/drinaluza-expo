import React from 'react'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { useTheme } from '@/core/theme'

export default function HeaderTitle({ title, subtitle }: { title: string; subtitle?: string }) {
	const { colors } = useTheme()

	return (
		<View style={styles.container}>
			<Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
				{title}
			</Text>
			{subtitle ? (
				<Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
					{subtitle}
				</Text>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		justifyContent: 'center',
		alignItems: Platform.OS === 'ios' ? 'center' : 'flex-start'
	},
	title: {
		fontSize: Platform.OS === 'ios' ? 17 : 20,
		fontWeight: Platform.OS === 'ios' ? '600' : '500'
	},
	subtitle: {
		fontSize: 12,
		marginTop: 1
	}
})
