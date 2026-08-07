import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'
import { useTheme } from '@/core/theme'
import { useUser } from '@/core/contexts'
import ErrorState from '@/features/common/ErrorState'
import { HomeButton } from '@/features/common/buttons/HomeButton'

export default function NotFoundScreen() {
	const { colors } = useTheme()
	const { translate } = useUser()

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen options={{ title: translate('not_found', 'Not Found') }} />
			<View style={styles.icon}>
				<ErrorState />
			</View>
			<View style={styles.action}>
				<HomeButton replace label={translate('go_home', 'Go Home')} size={80} variant="primary" />
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
