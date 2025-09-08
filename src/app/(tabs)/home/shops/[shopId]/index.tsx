import { Stack, useRouter } from 'expo-router'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, StatusBar } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useTheme } from '@/contexts/ThemeContext'
import { useEffect, useState } from 'react'
import { getShopDetails } from '@/components/shops/shops.api'
import { Shop } from '@/components/shops/shops.interface'

export default function ShopDetailsScreen() {
	const { shopId } = useLocalSearchParams<{ shopId: string }>()
	const router = useRouter()
	const { colors } = useTheme()
	const [isLoading, setIsLoading] = useState(true)
	const [shop, setShop] = useState<Shop | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const fetchShopDetails = async () => {
			if (!shopId) return

			try {
				setIsLoading(true)
				const response = await getShopDetails(shopId)
				setShop(response.data)
			} catch (err) {
				console.error('Failed to fetch shop details:', err)
				setError('Failed to load shop details. Please try again.')
			} finally {
				setIsLoading(false)
			}
		}

		fetchShopDetails()
	}, [shopId])

	const handleViewProducts = () => {
		if (!shopId) return
		router.push({
			pathname: '/home/shops/[shopId]/products',
			params: { shopId }
		} as any)
	}

	if (isLoading) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	if (error || !shop) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
				<Text style={{ color: colors.text }}>{error || 'Shop not found'}</Text>
			</View>
		)
	}

	return (
		<>
			<StatusBar barStyle="light-content" backgroundColor={colors.primary} />
			<ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
				<Stack.Screen
					options={{
						title: shop.name || 'Shop Details',
						headerShown: true
					}}
				/>
				<View style={styles.content}>
					<View style={[styles.card, { backgroundColor: colors.card }]}>
						<Text style={[styles.shopName, { color: colors.text }]}>{shop.name}</Text>

						{shop.owner && (
							<View style={styles.section}>
								<Text style={[styles.sectionTitle, { color: colors.primary }]}>Owner</Text>
								<Text style={[styles.text, { color: colors.text }]}>
									{shop.owner.name} (@{shop.owner.slug})
								</Text>
							</View>
						)}

						<View style={styles.section}>
							<Text style={[styles.sectionTitle, { color: colors.primary }]}>Status</Text>
							<View
								style={[
									styles.statusBadge,
									{
										backgroundColor: shop.isActive ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)'
									}
								]}
							>
								<Text
									style={{
										color: shop.isActive ? '#4CAF50' : '#F44336',
										fontWeight: '600'
									}}
								>
									{shop.isActive ? 'Active' : 'Inactive'}
								</Text>
							</View>
						</View>

						<TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleViewProducts}>
							<Text style={styles.buttonText}>View Products</Text>
						</TouchableOpacity>
					</View>
				</View>
			</ScrollView>
		</>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16
	},
	content: {
		flex: 1
	},
	card: {
		backgroundColor: 'white',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2
	},
	shopName: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 20,
		color: '#333'
	},
	section: {
		marginBottom: 20
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 8
	},
	text: {
		fontSize: 16,
		marginBottom: 4
	},
	statusBadge: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		alignSelf: 'flex-start'
	},
	button: {
		padding: 16,
		borderRadius: 8,
		alignItems: 'center',
		marginTop: 16
	},
	buttonText: {
		color: 'white',
		fontSize: 16,
		fontWeight: '600'
	}
})
