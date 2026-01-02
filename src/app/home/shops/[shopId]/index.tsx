import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, useWindowDimensions } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getShopDetails } from '../../../../components/shops/shops.api'
import { Shop } from '../../../../components/shops/shops.interface'
import { useTheme } from '../../../../contexts/ThemeContext'

export default function ShopDetailsScreen() {
	const { shopId } = useLocalSearchParams<{ shopId: string }>()
	const router = useRouter()
	const { colors } = useTheme()
	const { width } = useWindowDimensions()
	const maxWidth = 800
	const isWideScreen = width > maxWidth
	const [shop, setShop] = useState<Shop | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const loadShopDetails = async () => {
			if (!shopId) return

			try {
				setLoading(true)
				const response = await getShopDetails(shopId)
				setShop(response.data)
			} catch (err) {
				console.error('Failed to load shop details:', err)
				setError('Failed to load shop details. Please try again.')
			} finally {
				setLoading(false)
			}
		}

		loadShopDetails()
	}, [shopId])

	const handleViewProducts = () => {
		if (!shopId) return
		router.push({
			pathname: '/home/shops/[shopId]/products',
			params: { shopId, shopName: shop?.name?.en || 'Shop' }
		})
	}

	if (loading) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	if (error || !shop) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
				<Text style={[styles.errorText, { color: colors.text }]}>{error || 'Shop not found'}</Text>
			</View>
		)
	}

	return (
		<ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={[isWideScreen && { maxWidth: maxWidth, alignSelf: 'center', width: '100%' }]}>
			<View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
				<Text style={[styles.shopName, { color: colors.text }]}>{shop.name?.en}</Text>

				{shop.owner && (
					<Text style={[styles.detail, { color: colors.textSecondary }]}>
						Owner: {shop.owner.name} (@{shop.owner.slug})
					</Text>
				)}

				{shop.location?.coordinates?.length === 2 && (
					<Text style={[styles.detail, { color: colors.textSecondary }]}>
						Location: {shop.location.coordinates[1].toFixed(6)}, {shop.location.coordinates[0].toFixed(6)}
					</Text>
				)}

				{typeof shop.deliveryRadiusKm === 'number' && <Text style={[styles.detail, { color: colors.textSecondary }]}>Delivery Radius: {shop.deliveryRadiusKm} km</Text>}

				<Text style={[styles.status, { color: shop.isActive ? '#4CAF50' : '#F44336' }]}>{shop.isActive ? 'Active' : 'Inactive'}</Text>

				<TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleViewProducts}>
					<Text style={styles.buttonText}>View Products</Text>
				</TouchableOpacity>
			</View>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16
	},
	card: {
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3
	},
	shopName: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 12
	},
	detail: {
		fontSize: 16,
		marginBottom: 8
	},
	status: {
		fontSize: 16,
		fontWeight: '600',
		marginTop: 8,
		marginBottom: 16
	},
	button: {
		borderRadius: 8,
		padding: 16,
		alignItems: 'center',
		marginTop: 8
	},
	buttonText: {
		color: 'white',
		fontSize: 16,
		fontWeight: '600'
	},
	errorText: {
		fontSize: 16,
		textAlign: 'center',
		padding: 20
	}
})
