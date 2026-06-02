import React from 'react'
import { StyleSheet, View, Text, ActivityIndicator, Platform } from 'react-native'
import { useTheme } from '@/core/theme'
import { SmartScreenHeaderTitleProps } from '../types'

const Title: React.FC<SmartScreenHeaderTitleProps> = ({ title, subtitle, loading = false, color, subtitleColor }) => {
	const { colors } = useTheme()

	if (!title) return null

	return (
		<View style={styles.container}>
			<View style={styles.titleRow}>
				<Text style={[styles.title, { color: color || colors.text }]} numberOfLines={1} ellipsizeMode="tail">
					{title}
				</Text>
				{loading && <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />}
			</View>
			{subtitle ? (
				<Text style={[styles.subtitle, { color: subtitleColor || colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
					{subtitle}
				</Text>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		justifyContent: 'center',
		alignItems: 'center',
		alignSelf: 'center',
		maxWidth: '100%'
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
	},
	title: {
		fontSize: Platform.OS === 'ios' ? 17 : 18,
		fontWeight: Platform.OS === 'ios' ? '600' : '700',
		textAlign: 'center'
	},
	subtitle: {
		fontSize: 11,
		marginTop: 1,
		textAlign: 'center',
		fontWeight: '500'
	},
	spinner: {
		marginLeft: 8
	}
})

export default React.memo(Title)
