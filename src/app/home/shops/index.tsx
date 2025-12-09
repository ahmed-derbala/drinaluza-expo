import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { useTheme } from '../../../contexts/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'
import ScreenHeader from '../../../components/common/ScreenHeader'

const { width } = Dimensions.get('window')

// Mock data - replace with actual API call when available
const MOCK_SHOPS = [
	{
		_id: '1',
		name: 'Fresh Market',
		owner: { _id: '1', slug: 'fresh-market', name: 'John Doe' },
		isActive: true,
		deliveryRadiusKm: 5,
		address: 'Downtown Area',
		productsCount: 45,
		rating: 4.5
	},
	{
		_id: '2',
		name: 'Tech Store',
		owner: { _id: '2', slug: 'tech-store', name: 'Jane Smith' },
		isActive: true,
		deliveryRadiusKm: 10,
		address: 'Tech District',
		productsCount: 120,
		rating: 4.8
	},
	{
		_id: '3',
		name: 'Fashion Boutique',
		owner: { _id: '3', slug: 'fashion-boutique', name: 'Alice Johnson' },
		isActive: true,
		deliveryRadiusKm: 8,
		address: 'Shopping Mall',
		productsCount: 89,
		rating: 4.6
	},
	{
		_id: '4',
		name: 'Home Essentials',
		owner: { _id: '4', slug: 'home-essentials', name: 'Bob Williams' },
		isActive: true,
		deliveryRadiusKm: 12,
		address: 'Residential Area',
		productsCount: 67,
		rating: 4.3
	},
	{
		_id: '5',
		name: 'Organic Foods',
		owner: { _id: '5', slug: 'organic-foods', name: 'Emma Davis' },
		isActive: true,
		deliveryRadiusKm: 6,
		address: 'Green Valley',
		productsCount: 78,
		rating: 4.9
	},
	{
		_id: '6',
		name: 'Sports Corner',
		owner: { _id: '6', slug: 'sports-corner', name: 'Mike Brown' },
		isActive: true,
		deliveryRadiusKm: 15,
		address: 'Sports Complex',
		productsCount: 134,
		rating: 4.4
	}
]

const createStyles = (colors: any, isDark: boolean) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: colors.background
		},
		headerSection: {
			padding: 20,
			paddingBottom: 16
		},
		headerTitle: {
			fontSize: 28,
			fontWeight: '800',
			color: colors.text,
			marginBottom: 8,
			letterSpacing: -0.5
		},
		headerSubtitle: {
			fontSize: 15,
			color: colors.textSecondary,
			letterSpacing: 0.1
		},
		listContent: {
			padding: 20,
			paddingTop: 8
		},
		shopCard: {
			marginBottom: 16,
			borderRadius: 20,
			overflow: 'hidden',
			backgroundColor: colors.card,
			borderWidth: 1,
			borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: isDark ? 0.3 : 0.08,
			shadowRadius: 12,
			elevation: 4
		},
		shopCardContent: {
			padding: 20
		},
		shopHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'flex-start',
			marginBottom: 16
		},
		shopInfo: {
			flex: 1,
			marginRight: 12
		},
		shopName: {
			fontSize: 20,
			fontWeight: '700',
			color: colors.text,
			marginBottom: 6,
			letterSpacing: -0.3
		},
		shopOwner: {
			fontSize: 14,
			color: colors.textSecondary,
			marginBottom: 4
		},
		shopAddress: {
			fontSize: 13,
			color: colors.textTertiary,
			flexDirection: 'row',
			alignItems: 'center'
		},
		shopIconContainer: {
			width: 56,
			height: 56,
			borderRadius: 16,
			justifyContent: 'center',
			alignItems: 'center'
		},
		shopStats: {
			flexDirection: 'row',
			alignItems: 'center',
			marginTop: 16,
			paddingTop: 16,
			borderTopWidth: 1,
			borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'
		},
		statItem: {
			flexDirection: 'row',
			alignItems: 'center',
			marginRight: 20
		},
		statIcon: {
			marginRight: 6
		},
		statText: {
			fontSize: 14,
			color: colors.textSecondary,
			fontWeight: '600'
		},
		ratingContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			marginLeft: 'auto'
		},
		ratingText: {
			fontSize: 15,
			fontWeight: '700',
			color: colors.text,
			marginLeft: 4
		},
		emptyContainer: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
			paddingVertical: 60
		},
		emptyIcon: {
			width: 80,
			height: 80,
			borderRadius: 40,
			justifyContent: 'center',
			alignItems: 'center',
			marginBottom: 20,
			backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(59, 130, 246, 0.08)'
		},
		emptyTitle: {
			fontSize: 18,
			fontWeight: '700',
			color: colors.textSecondary,
			marginBottom: 8,
			letterSpacing: -0.2
		},
		emptyText: {
			fontSize: 14,
			color: colors.textTertiary,
			textAlign: 'center',
			lineHeight: 20
		},
		loadingContainer: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center'
		}
	})

const SHOP_GRADIENTS = [
	['#667eea', '#764ba2'],
	['#f093fb', '#f5576c'],
	['#4facfe', '#00f2fe'],
	['#43e97b', '#38f9d7'],
	['#fa709a', '#fee140'],
	['#30cfd0', '#330867']
]

export default function ShopsListScreen() {
	const { colors, isDark } = useTheme()
	const router = useRouter()
	const [shops, setShops] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)

	const styles = createStyles(colors, isDark)

	const loadShops = async () => {
		try {
			// TODO: Replace with actual API call when available
			// const response = await getAllShops()
			// setShops(response.data.data)

			// Using mock data for now
			await new Promise((resolve) => setTimeout(resolve, 500))
			setShops(MOCK_SHOPS)
		} catch (error) {
			console.error('Error loading shops:', error)
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}

	const onRefresh = () => {
		setRefreshing(true)
		loadShops()
	}

	useEffect(() => {
		loadShops()
	}, [])

	const handleShopPress = (shopId: string) => {
		// Navigate to shop details
		router.push(`/home/shops/${shopId}` as any)
	}

	const renderShopCard = ({ item, index }: { item: any; index: number }) => {
		const gradient = SHOP_GRADIENTS[index % SHOP_GRADIENTS.length]

		return (
			<TouchableOpacity style={styles.shopCard} onPress={() => handleShopPress(item._id)} activeOpacity={0.7}>
				<View style={styles.shopCardContent}>
					<View style={styles.shopHeader}>
						<View style={styles.shopInfo}>
							<Text style={styles.shopName}>{item.name}</Text>
							<Text style={styles.shopOwner}>by {item.owner.name}</Text>
							{item.address && (
								<View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
									<Ionicons name="location-outline" size={14} color={colors.textTertiary} />
									<Text style={[styles.shopAddress, { marginLeft: 4 }]}>{item.address}</Text>
								</View>
							)}
						</View>
						<LinearGradient colors={gradient as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.shopIconContainer}>
							<MaterialIcons name="store" size={28} color="#fff" />
						</LinearGradient>
					</View>

					<View style={styles.shopStats}>
						<View style={styles.statItem}>
							<Ionicons name="cube-outline" size={18} color={colors.primary} style={styles.statIcon} />
							<Text style={styles.statText}>{item.productsCount} products</Text>
						</View>
						{item.deliveryRadiusKm && (
							<View style={styles.statItem}>
								<Ionicons name="navigate-outline" size={18} color={colors.secondary} style={styles.statIcon} />
								<Text style={styles.statText}>{item.deliveryRadiusKm} km</Text>
							</View>
						)}
						{item.rating && (
							<View style={styles.ratingContainer}>
								<Ionicons name="star" size={18} color="#F59E0B" />
								<Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
							</View>
						)}
					</View>
				</View>
			</TouchableOpacity>
		)
	}

	const renderEmpty = () => (
		<View style={styles.emptyContainer}>
			<View style={styles.emptyIcon}>
				<MaterialIcons name="store" size={40} color={colors.textTertiary} />
			</View>
			<Text style={styles.emptyTitle}>No shops available</Text>
			<Text style={styles.emptyText}>Check back later for new shops</Text>
		</View>
	)

	if (loading) {
		return (
			<View style={styles.container}>
				<ScreenHeader title="Browse Shops" showBack={true} />
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			</View>
		)
	}

	return (
		<View style={styles.container}>
			<ScreenHeader title="Browse Shops" showBack={true} />
			<View style={styles.headerSection}>
				<Text style={styles.headerTitle}>Discover Shops</Text>
				<Text style={styles.headerSubtitle}>
					{shops.length} {shops.length === 1 ? 'shop' : 'shops'} available near you
				</Text>
			</View>
			<FlatList
				data={shops}
				renderItem={renderShopCard}
				keyExtractor={(item) => item._id}
				contentContainerStyle={styles.listContent}
				showsVerticalScrollIndicator={false}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
				ListEmptyComponent={renderEmpty}
			/>
		</View>
	)
}
