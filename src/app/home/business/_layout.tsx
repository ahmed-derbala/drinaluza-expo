import React, { useState, useCallback } from 'react'
import { View, ActivityIndicator, StyleSheet, Alert, Text } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect, useRouter } from 'expo-router'
import { Stack } from 'expo-router'
import { useTheme } from '../../../contexts/ThemeContext'
import BusinessDashboard from '../../../components/business/BusinessDashboard'

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

	// Check user role on screen focus
	useFocusEffect(
		useCallback(() => {
			const checkUserRole = async () => {
				try {
					const userData = await AsyncStorage.getItem('userData')

					if (userData) {
						const user = JSON.parse(userData)
						setUserRole(user.role)
					}
				} catch (error) {
					console.error('Failed to check user role:', error)
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
	if (userRole !== 'shop_owner') {
		return (
			<View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
				<Text style={[styles.accessDeniedText, { color: colors.text }]}>Access Denied. This section is only available for shop owners.</Text>
			</View>
		)
	}

	// Show loading indicator while checking auth
	if (loading) {
		return (
			<View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	// Show access denied if not a shop owner
	if (userRole !== 'shop_owner') {
		return (
			<View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
				<Text style={[styles.accessDeniedText, { color: colors.text }]}>Access Denied. This section is only available for shop owners.</Text>
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen
				options={{
					headerShown: true,
					title: 'Business Dashboard',
					headerStyle: {
						backgroundColor: colors.background
					},
					headerTintColor: colors.text,
					headerTitleStyle: {
						fontWeight: 'bold'
					}
				}}
			/>
			<BusinessDashboard />
		</View>
	)
}
