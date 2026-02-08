import React from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useTheme } from '../../core/contexts/ThemeContext'

const ShopDetailsScreen = () => {
	const { shopId } = useLocalSearchParams<{ shopId: string }>()
	const { colors } = useTheme()

	// In a real app, you would fetch the shop details using the shopId
	const isLoading = false // Set to true when fetching data
	const shop = null // Fetch shop data here

	if (isLoading) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Text style={[styles.shopId, { color: colors.text }]}>Shop ID: {shopId}</Text>
			{/* Add more shop details here */}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 16
	},
	shopId: {
		fontSize: 16,
		marginBottom: 8
	}
})

export default ShopDetailsScreen
