import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect, useRouter } from 'expo-router'
import { Tabs } from 'expo-router'
import { useTheme } from '../../../contexts/ThemeContext'

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
					console.log('Business Layout - Raw userData from AsyncStorage:', userData)

					if (userData) {
						const user = JSON.parse(userData)
						console.log('Business Layout - Parsed user object:', user)
						console.log('Business Layout - User role:', user.role)
						setUserRole(user.role)

						// If user is not a shop owner, redirect to home
						if (user.role !== 'shop_owner') {
							Alert.alert('Access Denied', 'This section is only available for shop owners.', [
								{
									text: 'OK',
									onPress: () => router.push('/home') as any
								}
							])
						}
					} else {
						console.log('Business Layout - No userData found in AsyncStorage')
						Alert.alert('Access Denied', 'No user data found. Please sign in again.', [{ text: 'OK' }])
					}
				} catch (error) {
					console.error('Failed to check user role:', error)
					Alert.alert('Error', 'Failed to verify user permissions. Please try again.', [{ text: 'OK' }])
				} finally {
					setLoading(false)
				}
			}
			checkUserRole()
		}, [])
	)

	// Show loading or access denied for non-shop owners
	if (loading) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
			</View>
		)
	}

	if (userRole !== 'shop_owner') {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<Text style={[styles.accessDeniedText, { color: colors.text }]}>Access Denied. This section is only available for shop owners.</Text>
			</View>
		)
	}

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarActiveTintColor: colors.primary,
				tabBarInactiveTintColor: colors.textSecondary,
				tabBarStyle: {
					backgroundColor: colors.background,
					borderTopColor: colors.border
				}
			}}
		>
			<Tabs.Screen
				name="my-products"
				options={{
					title: 'My Products',
					headerShown: true
				}}
			/>
			<Tabs.Screen
				name="my-shops"
				options={{
					title: 'My Shops',
					headerShown: true
				}}
			/>
			<Tabs.Screen
				name="sales"
				options={{
					title: 'Sales',
					headerShown: true
				}}
			/>
		</Tabs>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#1a1a1a'
	},
	loadingText: {
		color: '#fff',
		fontSize: 18,
		textAlign: 'center',
		marginTop: 50
	},
	accessDeniedContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20
	},
	accessDeniedTitle: {
		color: '#fff',
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 10,
		textAlign: 'center'
	},
	accessDeniedText: {
		color: '#bbb',
		fontSize: 16,
		textAlign: 'center',
		lineHeight: 24
	}
})
