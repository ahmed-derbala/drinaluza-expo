import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import { useTheme } from '@/core/theme'
import ErrorState from '@/features/common/ErrorState'
import { HomeButton } from '@/features/common/buttons/HomeButton'

export default function NotFoundScreen() {
	const { colors } = useTheme()

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen options={{ title: '404' }} />
			<View style={styles.icon}>
				<ErrorState />
			</View>
			<View style={styles.action}>
				<HomeButton />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	icon: {
		flex: 1
	},
	action: {
		paddingHorizontal: 40,
		paddingBottom: 40,
		alignItems: 'center'
	}
})
