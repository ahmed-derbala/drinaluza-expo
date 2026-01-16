import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, useWindowDimensions, TouchableOpacity } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { getShopProductsBySlug } from '../../../../components/shops/shops.api'
import { Product } from '../../../../components/shops/shops.interface'
import { useTheme } from '../../../../contexts/ThemeContext'
import { parseError } from '../../../../utils/errorHandler'
import ErrorState from '../../../../components/common/ErrorState'
import ScreenHeader from '../../../../components/common/ScreenHeader'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import Toast from '../../../../components/common/Toast'
import { TextInput } from 'react-native'
import FeedCard from '../../../../components/feed/feed.card'
import { FeedItem, ProductFeedItem } from '../../../../components/feed/feed.interface'
import { useUser } from '../../../../contexts/UserContext'

export default function ShopProductsScreen() {
	const { shopId: shopSlug } = useLocalSearchParams<{ shopId: string }>()
	const { colors } = useTheme()
	const { localize, translate } = useUser()
	const [headerTitle, setHeaderTitle] = useState(translate('shop_products', 'Products'))
	const { width } = useWindowDimensions()
	const maxWidth = 900
	const isWideScreen = width > maxWidth
	const numColumns = isWideScreen ? Math.max(2, Math.floor(width / 400)) : 1
	const [products, setProducts] = useState<Product[]>([])
	const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
	const [basket, setBasket] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)
	const [searchText, setSearchText] = useState('')
	const [showToast, setShowToast] = useState(false)
	const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')
	const [toastMessage, setToastMessage] = useState('')

	// Header is now handled by Stack.Screen options below

	const loadBasket = async () => {
		try {
			const savedBasket = await AsyncStorage.getItem('basket')
			if (savedBasket) setBasket(JSON.parse(savedBasket))
		} catch (err) {
			console.error('Failed to load basket:', err)
		}
	}

	const loadProducts = async () => {
		if (!shopSlug) return

		try {
			if (!refreshing) setLoading(true)
			setError(null)
			const response = await getShopProductsBySlug(shopSlug)
			const fetchedProducts = response.data.docs || []
			setProducts(fetchedProducts)
			setFilteredProducts(fetchedProducts)

			// Update header title if shop info is available in products
			if (fetchedProducts.length > 0 && fetchedProducts[0].shop?.name) {
				setHeaderTitle(localize(fetchedProducts[0].shop.name))
			}
		} catch (err: any) {
			console.error('Failed to load products:', err)
			const errorInfo = parseError(err)
			setError({
				title: errorInfo.title,
				message: errorInfo.message,
				type: errorInfo.type
			})
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}

	useEffect(() => {
		loadBasket()
		loadProducts()
	}, [shopSlug])

	useEffect(() => {
		if (!searchText.trim()) {
			setFilteredProducts(products)
			return
		}
		const searchLower = searchText.toLowerCase()
		const filtered = products.filter((p) => localize(p.name).toLowerCase().includes(searchLower))
		setFilteredProducts(filtered)
	}, [searchText, products, localize])

	const addToBasket = async (item: FeedItem, quantity: number) => {
		try {
			const existingItemIndex = basket.findIndex((basketItem) => basketItem._id === item._id)
			let newBasket: any[]

			if (existingItemIndex > -1) {
				newBasket = basket.map((basketItem, index) => (index === existingItemIndex ? { ...basketItem, quantity: basketItem.quantity + quantity } : basketItem))
			} else {
				newBasket = [...basket, { ...item, quantity }]
			}

			setBasket(newBasket)
			await AsyncStorage.setItem('basket', JSON.stringify(newBasket))

			setToastType('success')
			setToastMessage(`${localize(item.name)} ${translate('basket_added_to_basket', 'added to basket')}`)
			setShowToast(true)
		} catch (err) {
			console.error('Failed to add to basket:', err)
			setToastType('error')
			setToastMessage(translate('basket_failed_to_add', 'Failed to add to basket'))
			setShowToast(true)
		}
	}

	const handleRefresh = () => {
		loadProducts()
	}

	const renderProductItem = ({ item }: { item: Product }) => (
		<View style={[styles.cardWrapper, { width: numColumns > 1 ? '48%' : '100%' }]}>
			<FeedCard item={item as unknown as FeedItem} addToBasket={addToBasket} />
		</View>
	)

	if (loading && !refreshing) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScreenHeader title={headerTitle} showBack={true} />

			{/* Local Search Component */}
			{!error && (
				<View style={styles.searchContainer}>
					<View style={[styles.searchInputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
						<Ionicons name="search-outline" size={20} color={colors.textSecondary} style={styles.searchIcon} />
						<TextInput
							style={[styles.searchInput, { color: colors.text }]}
							placeholder={translate('shop_search_placeholder', 'Search in this shop...')}
							placeholderTextColor={colors.textTertiary}
							value={searchText}
							onChangeText={setSearchText}
							autoCorrect={false}
							autoCapitalize="none"
						/>
						{searchText.length > 0 && (
							<TouchableOpacity onPress={() => setSearchText('')}>
								<Ionicons name="close-circle" size={20} color={colors.textSecondary} />
							</TouchableOpacity>
						)}
					</View>
				</View>
			)}

			<FlatList
				data={filteredProducts}
				renderItem={renderProductItem}
				keyExtractor={(item) => item._id}
				numColumns={numColumns}
				contentContainerStyle={[styles.listContent, isWideScreen && { maxWidth: maxWidth, alignSelf: 'center', width: '100%' }]}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
				columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
				ListEmptyComponent={
					error ? (
						<ErrorState
							title={error.title}
							message={error.message}
							onRetry={loadProducts}
							icon={error.type === 'network' || error.type === 'timeout' ? 'cloud-offline-outline' : 'alert-circle-outline'}
						/>
					) : !loading && !refreshing ? (
						<View style={styles.emptyContainer}>
							<Ionicons name="search-outline" size={48} color={colors.textTertiary} style={{ marginBottom: 12 }} />
							<Text style={[styles.emptyText, { color: colors.text }]}>
								{searchText ? translate('shop_no_results', 'No products match your search') : translate('shop_no_products', 'No products found for this shop.')}
							</Text>
						</View>
					) : null
				}
			/>

			<Toast visible={showToast} message={toastMessage} type={toastType} onHide={() => setShowToast(false)} />
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	listContent: {
		padding: 16,
		paddingTop: 8,
		flexGrow: 1
	},
	columnWrapper: {
		justifyContent: 'space-between'
	},
	cardWrapper: {
		marginBottom: 16
	},
	searchContainer: {
		padding: 16,
		paddingBottom: 8
	},
	searchInputWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 12,
		paddingHorizontal: 12,
		height: 48,
		borderWidth: 1
	},
	searchIcon: {
		marginRight: 8
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		padding: 0
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 40,
		marginTop: 40
	},
	emptyText: {
		fontSize: 16,
		fontWeight: '600',
		textAlign: 'center'
	}
})
