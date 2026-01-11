import React, { useState, useCallback } from 'react'
import { View, ActivityIndicator, StyleSheet, Alert, Text } from 'react-native'
import { secureGetItem } from '../../../core/auth/storage'
import { useFocusEffect, useRouter, Stack } from 'expo-router'
import { useTheme } from '../../../contexts/ThemeContext'
import { getPlatformStackOptions, withThemedHeader } from '../../../config/navigation'
import { log } from '../../../core/log'

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	loadingContainer: {
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

export default function BusinessLayout() {
	const { colors } = useTheme()
	const router = useRouter()
	const [userRole, setUserRole] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)
	const stackOptions = getPlatformStackOptions(
		withThemedHeader(colors, {
			contentStyle: {
				backgroundColor: colors.background
			}
		})
	)

	// Check user role on screen focus
	useFocusEffect(
		useCallback(() => {
			const checkUserRole = async () => {
				try {
					const userData = await secureGetItem('userData')

					if (userData) {
						const user = JSON.parse(userData)
						setUserRole(user.role)
					}
				} catch (error) {
					log({
						level: 'error',
						label: 'business.layout',
						message: 'Failed to check user role',
						error
					})
					Alert.alert('Error', 'Failed to verify user permissions. Please try again.', [{ text: 'OK' }])
				} finally {
					setLoading(false)
				}
			}
			checkUserRole()
		}, [router])
	)

	// Show loading indicator while checking auth
	if (loading) {
		return (
			<View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	// Show access denied if not a shop owner
	log({
		level: 'debug',
		label: 'business.layout',
		message: 'Checking user role access',
		data: { userRole }
	})

	if (userRole !== 'shop_owner') {
		return (
			<View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
				<Text style={[styles.accessDeniedText, { color: colors.text }]}>Access Denied. This section is only available for shop owners.</Text>
			</View>
		)
	}

	return (
		<Stack screenOptions={stackOptions}>
			<Stack.Screen
				name="index"
				options={{
					title: 'Business Dashboard',
					headerShown: false // Dashboard has its own header
				}}
			/>
			<Stack.Screen
				name="my-shops"
				options={{
					title: 'My Shops',
					headerShown: true
				}}
			/>
			<Stack.Screen
				name="my-products"
				options={{
					title: 'My Products',
					headerShown: true
				}}
			/>
			<Stack.Screen
				name="sales"
				options={{
					title: 'Sales',
					headerShown: false
				}}
			/>
			<Stack.Screen
				name="create-product"
				options={{
					headerShown: false
				}}
			/>
			<Stack.Screen
				name="shops/[shopSlug]"
				options={{
					headerShown: false
				}}
			/>
		</Stack>
	)
}
