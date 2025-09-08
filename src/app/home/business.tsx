import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from '@react-navigation/native'
import SalesTab from '../../components/business/SalesTab'
import MyShopsTab from '../../components/business/MyShopsTab'
import MyProductsTab from '../../components/business/MyProductsTab'

export default function BusinessScreen() {
	const [selectedTab, setSelectedTab] = useState(0) // 0: Sales, 1: My Shops, 2: My Products
	const [userRole, setUserRole] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)

	// Check user role on screen focus
	useFocusEffect(
		useCallback(() => {
			const checkUserRole = async () => {
				try {
					const userData = await AsyncStorage.getItem('userData')
					console.log('Business Screen - Raw userData from AsyncStorage:', userData)

					if (userData) {
						const user = JSON.parse(userData)
						console.log('Business Screen - Parsed user object:', user)
						console.log('Business Screen - User role:', user.role)
						setUserRole(user.role)

						// If user is not a shop owner, show access denied
						if (user.role !== 'shop_owner') {
							Alert.alert('Access Denied', `This section is only available for shop owners. Your role: ${user.role || 'undefined'}`, [{ text: 'OK' }])
						}
					} else {
						console.log('Business Screen - No userData found in AsyncStorage')
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
			<View style={styles.container}>
				<Text style={styles.loadingText}>Loading...</Text>
			</View>
		)
	}

	if (userRole !== 'shop_owner') {
		return (
			<View style={styles.container}>
				<View style={styles.accessDeniedContainer}>
					<Text style={styles.accessDeniedTitle}>Access Denied</Text>
					<Text style={styles.accessDeniedText}>This business section is only available for shop owners.</Text>
				</View>
			</View>
		)
	}

	const tabs = [
		{ id: 0, title: 'Sales', component: <SalesTab /> },
		{ id: 1, title: 'My Shops', component: <MyShopsTab /> },
		{ id: 2, title: 'My Products', component: <MyProductsTab /> }
	]

	return (
		<View style={styles.container}>
			{/* Tab Navigation */}
			<View style={styles.tabContainer}>
				{tabs.map((tab) => (
					<TouchableOpacity key={tab.id} style={[styles.tab, selectedTab === tab.id && styles.activeTab]} onPress={() => setSelectedTab(tab.id)}>
						<Text style={[styles.tabText, selectedTab === tab.id && styles.activeTabText]}>{tab.title}</Text>
					</TouchableOpacity>
				))}
			</View>

			{/* Tab Content */}
			<View style={styles.tabContent}>{tabs[selectedTab].component}</View>
		</View>
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
	},
	tabContainer: {
		flexDirection: 'row',
		backgroundColor: '#333',
		margin: 10,
		borderRadius: 8,
		overflow: 'hidden'
	},
	tab: {
		flex: 1,
		padding: 12,
		alignItems: 'center',
		justifyContent: 'center'
	},
	activeTab: {
		backgroundColor: '#007AFF'
	},
	tabText: {
		color: '#aaa',
		fontWeight: '600',
		fontSize: 14
	},
	activeTabText: {
		color: '#fff'
	},
	tabContent: {
		flex: 1
	}
})
