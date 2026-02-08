import React from 'react'
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'

interface NavigationGuardProps {
	children: React.ReactNode
	isLoading?: boolean
	accessDenied?: boolean
	accessDeniedMessage?: string
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	accessDeniedText: {
		fontSize: 16,
		textAlign: 'center' as const,
		padding: 20,
		lineHeight: 24
	}
})

export function NavigationGuard({ children, isLoading = false, accessDenied = false, accessDeniedMessage = 'Access Denied' }: NavigationGuardProps) {
	const { colors } = useTheme()

	if (isLoading) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	if (accessDenied) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<Text style={[styles.accessDeniedText, { color: colors.text }]}>{accessDeniedMessage}</Text>
			</View>
		)
	}

	return <>{children}</>
}
