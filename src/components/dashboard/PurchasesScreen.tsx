import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Animated, Dimensions, useWindowDimensions, ScrollView, Alert } from 'react-native'
import SmartImage from '../common/SmartImage'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../../contexts/ThemeContext'
import ScreenHeader from '../common/ScreenHeader'
import ErrorState from '../common/ErrorState'
import { getPurchases, updatePurchaseStatus, createPurchase } from '../orders/orders.api'
import { OrderItem } from '../orders/orders.interface'
import { orderStatusEnum, orderStatusColors, orderStatusLabels } from '../../constants/orderStatus'
import { FeedItem } from '../feed/feed.interface'
import { useBackButton } from '../../hooks/useBackButton'
import { parseError, logError } from '../../utils/errorHandler'

type FilterStatus = 'cart' | 'active' | 'completed' | 'cancelled'

type BasketItem = FeedItem & { quantity: number }

type ShopBasketGroup = {
	shopId: string
	shopName: string
	items: BasketItem[]
}

const PurchasesScreen = () => {
	const { colors, isDark } = useTheme()
	const router = useRouter()
	const [refreshing, setRefreshing] = useState(false)
	const [loading, setLoading] = useState(true)
	const [purchases, setPurchases] = useState<OrderItem[]>([])
	const [basket, setBasket] = useState<BasketItem[]>([])
	const [filter, setFilter] = useState<FilterStatus>('cart')
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)
	const fadeAnim = React.useRef(new Animated.Value(0)).current

	useBackButton(undefined, '/home/dashboard')

	const { width } = useWindowDimensions()

	const numColumns = useMemo(() => {
		if (width > 1400) return 4
		if (width > 1100) return 3
		if (width > 700) return 2
		return 1
	}, [width])

	const styles = useMemo(() => createStyles(colors, isDark, width, numColumns, filter), [colors, isDark, width, numColumns, filter])

	const loadBasket = async () => {
		try {
			const storedBasket = await AsyncStorage.getItem('basket')
			if (storedBasket) {
				setBasket(JSON.parse(storedBasket))
			}
		} catch (error) {
			console.error('Failed to load basket:', error)
		}
	}

	const loadPurchases = async () => {
		try {
			setError(null)
			const response = await getPurchases()
			setPurchases(response.data.docs || [])
			setLoading(false)
			setRefreshing(false)

			// Fade in animation
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 400,
				useNativeDriver: true
			}).start()
		} catch (err: any) {
			logError(err, 'loadPurchases')
			const errorInfo = parseError(err)
			setError({
				title: errorInfo.title,
				message: errorInfo.message,
				type: errorInfo.type
			})
			setLoading(false)
			setRefreshing(false)
		}
	}

	const onRefresh = () => {
		setRefreshing(true)
		loadPurchases()
		loadBasket()
	}

	useEffect(() => {
		loadPurchases()
		loadBasket()
	}, [])

	// Refresh basket when screen comes into focus
	useFocusEffect(
		React.useCallback(() => {
			loadBasket()
		}, [])
	)

	const handleCancelOrder = async (purchaseId: string) => {
		Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
			{ text: 'No', style: 'cancel' },
			{
				text: 'Yes, Cancel',
				style: 'destructive',
				onPress: async () => {
					try {
						await updatePurchaseStatus({ purchaseId })
						loadPurchases()
						Alert.alert('Success', 'Order cancelled successfully')
					} catch (error) {
						console.error('Error cancelling order:', error)
						Alert.alert('Error', 'Failed to cancel order. Please try again.')
					}
				}
			}
		])
	}

	const handleStatusUpdate = async (purchaseId: string, newStatus: string) => {
		try {
			await updatePurchaseStatus({ purchaseId, status: newStatus })
			loadPurchases()
			Alert.alert('Success', 'Order status updated successfully')
		} catch (error) {
			console.error('Error updating order status:', error)
			Alert.alert('Error', 'Failed to update order status. Please try again.')
		}
	}

	// Filter purchases based on selected filter
	const filteredPurchases = useMemo(() => {
		switch (filter) {
			case 'active':
				return purchases.filter(
					(p) =>
						p.status === orderStatusEnum.PENDING_SHOP_CONFIRMATION ||
						p.status === orderStatusEnum.CONFIRMED_BY_SHOP ||
						p.status === orderStatusEnum.RESERVED_BY_SHOP_FOR_PICKUP_BY_CUSTOMER ||
						p.status === orderStatusEnum.DELIVERING_TO_CUSTOMER
				)
			case 'completed':
				return purchases.filter((p) => p.status === orderStatusEnum.DELIVERED_TO_CUSTOMER || p.status === orderStatusEnum.RECEIVED_BY_CUSTOMER)
			case 'cancelled':
				return purchases.filter((p) => p.status === orderStatusEnum.CANCELLED_BY_CUSTOMER || p.status === orderStatusEnum.CANCELLED_BY_SHOP || p.status === orderStatusEnum.RESERVATION_EXPIRED)
			default:
				return []
		}
	}, [purchases, filter])

	const groupedBasket = useMemo(() => {
		const groups: { [key: string]: ShopBasketGroup } = {}
		basket.forEach((item) => {
			const shopId = item.shop?._id || 'unknown'
			if (!groups[shopId]) {
				groups[shopId] = {
					shopId,
					shopName: item.shop?.name?.en || 'Unknown Shop',
					items: []
				}
			}
			groups[shopId].items.push(item)
		})
		return Object.values(groups)
	}, [basket])

	const getStatusIcon = (status: string) => {
		switch (status) {
			case orderStatusEnum.PENDING_SHOP_CONFIRMATION:
				return 'time-outline'
			case orderStatusEnum.CONFIRMED_BY_SHOP:
			case orderStatusEnum.RESERVED_BY_SHOP_FOR_PICKUP_BY_CUSTOMER:
				return 'storefront-outline'
			case orderStatusEnum.DELIVERING_TO_CUSTOMER:
				return 'bicycle-outline'
			case orderStatusEnum.DELIVERED_TO_CUSTOMER:
			case orderStatusEnum.RECEIVED_BY_CUSTOMER:
				return 'checkmark-circle-outline'
			case orderStatusEnum.CANCELLED_BY_CUSTOMER:
			case orderStatusEnum.CANCELLED_BY_SHOP:
			case orderStatusEnum.RESERVATION_EXPIRED:
				return 'close-circle-outline'
			default:
				return 'receipt-outline'
		}
	}

	const canCancelOrder = (status: string) => {
		return status === orderStatusEnum.PENDING_SHOP_CONFIRMATION
	}

	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		const now = new Date()
		const diffTime = Math.abs(now.getTime() - date.getTime())
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

		if (diffDays === 0) return 'Today'
		if (diffDays === 1) return 'Yesterday'
		if (diffDays < 7) return `${diffDays} days ago`
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
	}

	const renderPurchaseItem = ({ item }: { item: OrderItem }) => {
		const statusColor = orderStatusColors[item.status] || colors.textSecondary

		// Calculate total price and get product info
		const totalPrice =
			item.price?.total?.tnd ||
			item.products.reduce((sum, productItem) => {
				const price = productItem.product.price.total.tnd || 0
				const quantity = productItem.quantity || 0
				return sum + price * quantity
			}, 0)

		const containerWidth = (width - 12) / numColumns

		return (
			<View style={{ width: containerWidth }}>
				<View style={[styles.purchaseCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
					{/* Header */}
					<View style={styles.cardHeader}>
						<View style={styles.headerLeft}>
							<View style={[styles.iconContainer, { backgroundColor: statusColor + '15' }]}>
								<Ionicons name={getStatusIcon(item.status) as any} size={24} color={statusColor} />
							</View>
							<View style={styles.headerInfo}>
								<Text style={[styles.shopName, { color: colors.text }]}>{item.shop.name?.en}</Text>
								<Text style={[styles.orderDate, { color: colors.textSecondary }]}>{formatDate(item.createdAt)}</Text>
							</View>
						</View>
						<View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
							<Text style={[styles.statusText, { color: statusColor }]}>{orderStatusLabels[item.status] || item.status}</Text>
						</View>
					</View>

					{/* Divider */}
					<View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} />

					{/* Products Info */}
					<ScrollView style={styles.productInfo} nestedScrollEnabled showsVerticalScrollIndicator={false}>
						{item.products.map((productItem, index) => (
							<View key={index} style={styles.productRow}>
								<Ionicons name="cube-outline" size={16} color={colors.textTertiary} />
								<Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
									{productItem.product.name?.en}
								</Text>
								<Text style={[styles.productQuantity, { color: colors.textSecondary }]}>×{productItem.quantity}</Text>
							</View>
						))}
					</ScrollView>

					{/* Footer with Actions */}
					<View style={styles.cardFooter}>
						<View style={styles.footerLeft}>
							<Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
							<Text style={[styles.footerText, { color: colors.textTertiary }]}>Order #{item._id.slice(-6)}</Text>
						</View>
						<View style={styles.footerRight}>
							<Text style={[styles.totalPrice, { color: colors.text }]}>{totalPrice.toFixed(2)} TND</Text>
						</View>
					</View>

					{/* Status Action Buttons */}
					{item.status === orderStatusEnum.DELIVERED_TO_CUSTOMER && (
						<View style={styles.actionButtonsContainer}>
							<TouchableOpacity
								style={[styles.actionButton, { backgroundColor: orderStatusColors[orderStatusEnum.RECEIVED_BY_CUSTOMER] }]}
								onPress={() => handleStatusUpdate(item._id, orderStatusEnum.RECEIVED_BY_CUSTOMER)}
							>
								<Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
								<Text style={styles.actionButtonText}>Mark as Received</Text>
							</TouchableOpacity>
						</View>
					)}

					{/* Cancel Button (if applicable) */}
					{canCancelOrder(item.status) && (
						<View style={styles.cancelButtonContainer}>
							<TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.error + '15' }]} onPress={() => handleCancelOrder(item._id)}>
								<Ionicons name="close-circle-outline" size={16} color={colors.error} />
								<Text style={[styles.cancelText, { color: colors.error }]}>Cancel Order</Text>
							</TouchableOpacity>
						</View>
					)}
				</View>
			</View>
		)
	}

	const updateBasketQuantity = async (itemId: string, newQuantity: number) => {
		try {
			if (newQuantity < 1) {
				Alert.alert('Remove Item', 'Do you want to remove this item from your cart?', [
					{ text: 'Cancel', style: 'cancel' },
					{
						text: 'Remove',
						style: 'destructive',
						onPress: () => removeFromBasket(itemId)
					}
				])
				return
			}

			const newBasket = basket.map((item) => (item._id === itemId ? { ...item, quantity: newQuantity } : item))
			setBasket(newBasket)
			await AsyncStorage.setItem('basket', JSON.stringify(newBasket))
		} catch (error) {
			console.error('Error updating basket:', error)
		}
	}

	const removeFromBasket = async (itemId: string) => {
		try {
			const newBasket = basket.filter((item) => item._id !== itemId)
			setBasket(newBasket)
			await AsyncStorage.setItem('basket', JSON.stringify(newBasket))
		} catch (error) {
			console.error('Error removing from basket:', error)
		}
	}

	const handleCheckout = async (group: ShopBasketGroup) => {
		try {
			const shop = group.items[0]?.shop
			if (!shop) throw new Error('Shop not found')

			// Map products for API
			const products = group.items.map((item) => ({
				product: {
					slug: item.slug,
					_id: item._id
				},
				quantity: item.quantity
			}))

			// Call createPurchase API
			await createPurchase({
				products,
				shop: {
					slug: shop.slug,
					_id: shop._id
				}
			})

			// On success, remove these items from basket
			const purchasedItemIds = new Set(group.items.map((item) => item._id))
			const newBasket = basket.filter((item) => !purchasedItemIds.has(item._id))

			setBasket(newBasket)
			await AsyncStorage.setItem('basket', JSON.stringify(newBasket))

			Alert.alert('Success', 'Order placed successfully!')

			// Refresh purchases list and switch tab
			onRefresh()
			setFilter('active')
		} catch (error) {
			console.error('Checkout failed:', error)
			Alert.alert('Error', 'Failed to place order')
		}
	}

	const renderBasketGroup = ({ item: group }: { item: ShopBasketGroup }) => {
		const groupTotal = group.items.reduce((sum: number, item: BasketItem) => {
			const price = item.price?.total?.tnd || 0
			const quantity = item.quantity || 1
			return sum + price * quantity
		}, 0)

		const containerWidth = (width - 12) / numColumns

		return (
			<View style={{ width: containerWidth }}>
				<View style={[styles.purchaseCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
					<View style={{ flex: 1 }}>
						{/* Header */}
						<View style={styles.cardHeader}>
							<View style={styles.headerLeft}>
								<View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
									<Ionicons name="storefront-outline" size={24} color={colors.primary} />
								</View>
								<View style={styles.headerInfo}>
									<Text style={[styles.shopName, { color: colors.text }]}>{group.shopName}</Text>
									<Text style={[styles.orderDate, { color: colors.textSecondary }]}>
										{group.items.length} {group.items.length === 1 ? 'item' : 'items'}
									</Text>
								</View>
							</View>
							<View style={[styles.statusBadge, { backgroundColor: colors.primary + '15' }]}>
								<Text style={[styles.statusText, { color: colors.primary }]}>DRAFT ORDER</Text>
							</View>
						</View>

						{/* Items List */}
						<ScrollView style={{ flex: 1, marginHorizontal: -6 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
							<View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
								{group.items.map((item: BasketItem, index: number) => {
									const price = item.price?.total?.tnd || 0
									const quantity = item.quantity || 1
									const itemWidth = '100%'
									const imageUrl = item.media?.thumbnail?.url || item.defaultProduct?.media?.thumbnail?.url || (item.photos && item.photos.length > 0 ? item.photos[0] : null)

									return (
										<View key={item._id} style={{ width: itemWidth, paddingHorizontal: 6, paddingVertical: 6 }}>
											<View
												style={[
													styles.basketItemCard,
													{
														backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
														borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
													}
												]}
											>
												{/* Image Area */}
												<View style={styles.basketItemImageContainer}>
													<SmartImage source={{ uri: imageUrl || '' }} style={styles.basketItemImage} resizeMode="cover" fallbackIcon="image" />
												</View>

												{/* Content Area */}
												<View style={styles.basketItemContent}>
													<View style={styles.itemTopRow}>
														<Text style={[styles.basketItemName, { color: colors.text }]} numberOfLines={2}>
															{item.name?.en}
														</Text>
														<TouchableOpacity onPress={() => removeFromBasket(item._id)} style={styles.deleteButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
															<Ionicons name="trash-outline" size={18} color={colors.error} />
														</TouchableOpacity>
													</View>

													<View style={styles.itemBottomRow}>
														<Text style={[styles.basketItemPrice, { color: colors.primary }]}>
															{(price * quantity).toFixed(2)} <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textTertiary }}>TND</Text>
														</Text>

														<View style={[styles.compactQuantityControl, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f5' }]}>
															<TouchableOpacity
																onPress={() => updateBasketQuantity(item._id, quantity - 1)}
																style={[styles.compactQBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff', shadowOpacity: isDark ? 0 : 0.1 }]}
																hitSlop={{ top: 10, bottom: 10, left: 10, right: 5 }}
															>
																<Ionicons name="remove" size={16} color={colors.text} />
															</TouchableOpacity>

															<Text style={[styles.compactQText, { color: colors.text }]}>
																{quantity} {item.unit?.measure || ''}
															</Text>

															<TouchableOpacity
																onPress={() => updateBasketQuantity(item._id, quantity + 1)}
																style={[styles.compactQBtn, { backgroundColor: colors.primary, shadowOpacity: 0.2 }]}
																hitSlop={{ top: 10, bottom: 10, left: 5, right: 10 }}
															>
																<Ionicons name="add" size={16} color="#fff" />
															</TouchableOpacity>
														</View>
													</View>
												</View>
											</View>
										</View>
									)
								})}
							</View>
						</ScrollView>

						{/* Footer */}
						<View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} />
						<View style={styles.cardFooter}>
							<View style={styles.footerLeft}>
								<Ionicons name="pricetag-outline" size={14} color={colors.textTertiary} />
								<Text style={[styles.footerText, { color: colors.textTertiary }]}>Total Amount</Text>
							</View>
							<View style={styles.footerRight}>
								<Text style={[styles.totalPrice, { color: colors.text }]}>{groupTotal.toFixed(2)} TND</Text>
								<TouchableOpacity style={[styles.checkoutButton, { backgroundColor: colors.primary }]} onPress={() => handleCheckout(group)} activeOpacity={0.8}>
									<Ionicons name="card-outline" size={20} color="#fff" />
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</View>
			</View>
		)
	}

	const FilterButton = ({ status, label, icon }: { status: FilterStatus; label: string; icon: string }) => {
		const isActive = filter === status
		const count = useMemo(() => {
			switch (status) {
				case 'cart':
					return basket.length
				case 'active':
					return purchases.filter(
						(p) =>
							p.status === orderStatusEnum.PENDING_SHOP_CONFIRMATION ||
							p.status === orderStatusEnum.CONFIRMED_BY_SHOP ||
							p.status === orderStatusEnum.RESERVED_BY_SHOP_FOR_PICKUP_BY_CUSTOMER ||
							p.status === orderStatusEnum.DELIVERING_TO_CUSTOMER
					).length
				case 'completed':
					return purchases.filter((p) => p.status === orderStatusEnum.DELIVERED_TO_CUSTOMER || p.status === orderStatusEnum.RECEIVED_BY_CUSTOMER).length
				case 'cancelled':
					return purchases.filter((p) => p.status === orderStatusEnum.CANCELLED_BY_CUSTOMER || p.status === orderStatusEnum.CANCELLED_BY_SHOP || p.status === orderStatusEnum.RESERVATION_EXPIRED)
						.length
				default:
					return 0
			}
		}, [purchases, basket.length, status])

		return (
			<TouchableOpacity
				style={[styles.filterButton, isActive && { backgroundColor: colors.primary }, { borderColor: isActive ? colors.primary : colors.border }]}
				onPress={() => setFilter(status)}
				activeOpacity={0.7}
			>
				<Ionicons name={icon as any} size={18} color={isActive ? '#fff' : colors.text} />
				<Text style={[styles.filterText, { color: isActive ? '#fff' : colors.text }]}>{label}</Text>
				{count > 0 && (
					<View style={[styles.countBadge, { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : colors.primary + '15' }]}>
						<Text style={[styles.countText, { color: isActive ? '#fff' : colors.primary }]}>{count}</Text>
					</View>
				)}
			</TouchableOpacity>
		)
	}

	const renderEmptyState = () => {
		const emptyConfig = {
			cart: {
				icon: 'cart-outline',
				title: 'Your cart is empty',
				subtitle: 'Add items to your cart to see them here'
			},

			active: {
				icon: 'time-outline',
				title: 'No active orders',
				subtitle: 'All your orders have been completed or cancelled'
			},
			completed: {
				icon: 'checkmark-circle-outline',
				title: 'No completed orders',
				subtitle: 'Your completed orders will appear here'
			},
			cancelled: {
				icon: 'close-circle-outline',
				title: 'No cancelled orders',
				subtitle: 'You have no cancelled orders'
			}
		}

		const config = emptyConfig[filter]

		return (
			<View style={styles.emptyContainer}>
				<View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '10' }]}>
					<Ionicons name={config.icon as any} size={64} color={colors.primary} />
				</View>
				<Text style={[styles.emptyTitle, { color: colors.text }]}>{config.title}</Text>
				<Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{config.subtitle}</Text>
			</View>
		)
	}

	if (loading) {
		return (
			<View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
				<ActivityIndicator size="large" color={colors.primary} />
				<Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading purchases...</Text>
			</View>
		)
	}

	if (error && purchases.length === 0 && filter !== 'cart') {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<ScreenHeader title="Purchases" showBack={true} onBackPress={() => (router.canGoBack() ? router.back() : router.replace('/home/dashboard' as any))} />
				<ErrorState
					title={error.title}
					message={error.message}
					onRetry={loadPurchases}
					icon={error.type === 'network' || error.type === 'timeout' ? 'cloud-offline-outline' : 'alert-circle-outline'}
				/>
			</View>
		)
	}

	const displayData = filter === 'cart' ? groupedBasket : filteredPurchases
	const itemCount = displayData.length

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScreenHeader
				title="Purchases"
				subtitle={`${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
				showBack={true}
				onBackPress={() => (router.canGoBack() ? router.back() : router.replace('/home/dashboard' as any))}
				rightActions={
					<TouchableOpacity onPress={onRefresh}>
						<Ionicons name={refreshing ? 'hourglass-outline' : 'refresh-outline'} size={24} color={colors.text} />
					</TouchableOpacity>
				}
			/>

			<Animated.View style={[styles.content, { opacity: fadeAnim }]}>
				{/* Filter Tabs */}
				<View style={styles.filterContainer}>
					<FilterButton status="cart" label="Cart" icon="cart-outline" />

					<FilterButton status="active" label="Active" icon="time-outline" />
					<FilterButton status="completed" label="Done" icon="checkmark-circle-outline" />
					<FilterButton status="cancelled" label="Cancelled" icon="close-circle-outline" />
				</View>

				{/* Purchases List */}
				<FlatList
					key={numColumns}
					numColumns={numColumns}
					data={displayData as any}
					renderItem={filter === 'cart' ? (renderBasketGroup as any) : renderPurchaseItem}
					keyExtractor={(item: any) => (filter === 'cart' ? item.shopId : item._id)}
					contentContainerStyle={styles.listContent}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
					ListEmptyComponent={renderEmptyState}
					showsVerticalScrollIndicator={false}
				/>
			</Animated.View>
		</View>
	)
}

const createStyles = (colors: any, isDark: boolean, width: number, numColumns: number, filter: string) => {
	const isTablet = width > 700

	return StyleSheet.create({
		container: {
			flex: 1
		},
		content: {
			flex: 1
		},
		loadingContainer: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center'
		},
		loadingText: {
			marginTop: 16,
			fontSize: 15,
			fontWeight: '500'
		},
		filterContainer: {
			flexDirection: 'row',
			padding: 16,
			gap: 8
		},
		filterButton: {
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			paddingVertical: 10,
			paddingHorizontal: 8,
			borderRadius: 12,
			borderWidth: 1.5,
			gap: 4
		},
		filterText: {
			fontSize: 12,
			fontWeight: '600'
		},
		countBadge: {
			minWidth: 18,
			height: 18,
			borderRadius: 9,
			justifyContent: 'center',
			alignItems: 'center',
			paddingHorizontal: 5
		},
		countText: {
			fontSize: 10,
			fontWeight: '700'
		},
		listContent: {
			padding: 6,
			paddingTop: 8
		},
		purchaseCard: {
			flex: 1,
			height: 480,
			borderRadius: 16,
			padding: 16,
			margin: 6,
			marginBottom: 12,
			borderWidth: 1,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: isDark ? 0.3 : 0.08,
			shadowRadius: 8,
			elevation: 4,
			width: numColumns === 1 && isTablet && filter !== 'cart' ? 600 : undefined,
			alignSelf: numColumns === 1 && isTablet && filter !== 'cart' ? 'center' : undefined,
			maxWidth: numColumns === 1 && isTablet && filter !== 'cart' ? '100%' : undefined
		},
		cardHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: 12
		},
		headerLeft: {
			flexDirection: 'row',
			alignItems: 'center',
			flex: 1
		},
		iconContainer: {
			width: 48,
			height: 48,
			borderRadius: 12,
			justifyContent: 'center',
			alignItems: 'center',
			marginRight: 12
		},
		headerInfo: {
			flex: 1
		},
		shopName: {
			fontSize: 16,
			fontWeight: '700',
			marginBottom: 2
		},
		orderDate: {
			fontSize: 13,
			fontWeight: '500'
		},
		statusBadge: {
			paddingHorizontal: 12,
			paddingVertical: 6,
			borderRadius: 12
		},
		statusText: {
			fontSize: 11,
			fontWeight: '700',
			textTransform: 'uppercase',
			letterSpacing: 0.5
		},
		divider: {
			height: 1,
			marginVertical: 12
		},
		productInfo: {
			flex: 1,
			marginBottom: 12
		},
		productRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8,
			marginBottom: 6
		},
		productName: {
			fontSize: 15,
			fontWeight: '600',
			flex: 1
		},

		productQuantity: {
			fontSize: 13,
			fontWeight: '600',
			marginLeft: 'auto'
		},
		productCount: {
			fontSize: 12,
			fontWeight: '500',
			marginTop: 4,
			marginLeft: 24
		},

		cardFooter: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center'
		},
		footerLeft: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 6
		},
		footerRight: {
			flexDirection: 'row',
			alignItems: 'center'
		},
		footerText: {
			fontSize: 12,
			fontWeight: '500'
		},
		totalPrice: {
			fontSize: 16,
			fontWeight: '700'
		},
		cancelButtonContainer: {
			marginTop: 12,
			paddingTop: 12,
			borderTopWidth: 1,
			borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
		},
		cancelButton: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: 6,
			paddingHorizontal: 16,
			paddingVertical: 10,
			borderRadius: 10
		},
		cancelText: {
			fontSize: 12,
			fontWeight: '600'
		},
		emptyContainer: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
			paddingVertical: 60,
			paddingHorizontal: 40
		},
		emptyIconContainer: {
			width: 120,
			height: 120,
			borderRadius: 60,
			justifyContent: 'center',
			alignItems: 'center',
			marginBottom: 24
		},
		emptyTitle: {
			fontSize: 18,
			fontWeight: '600',
			marginBottom: 8
		},
		basketItemCard: {
			flexDirection: 'row',
			alignItems: 'center',
			borderRadius: 16,
			padding: 12,
			gap: 12,
			// Keep subtle borders or shadows if desired, or make it flat
			borderBottomWidth: 1,
			borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
			backgroundColor: 'transparent' // Override card bg if we want a clean list look
		},
		basketItemImageContainer: {
			width: 80,
			height: 80,
			borderRadius: 12,
			overflow: 'hidden',
			backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f5'
		},
		basketItemImage: {
			width: '100%',
			height: '100%'
		},
		basketItemContent: {
			flex: 1,
			justifyContent: 'center',
			gap: 4
		},
		itemTopRow: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'flex-start',
			gap: 8,
			marginBottom: 4
		},
		itemBottomRow: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginTop: 4
		},
		basketItemName: {
			fontSize: 15,
			fontWeight: '600',
			flex: 1,
			lineHeight: 20
		},
		deleteButton: {
			padding: 4,
			opacity: 0.8
		},
		basketItemPrice: {
			fontSize: 16,
			fontWeight: '700'
		},
		compactQuantityControl: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			borderRadius: 20,
			padding: 3,
			height: 36,
			gap: 8
		},
		compactQBtn: {
			width: 28,
			height: 28,
			justifyContent: 'center',
			alignItems: 'center',
			borderRadius: 14,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 1 },
			shadowRadius: 2,
			elevation: 1
		},
		compactQText: {
			fontSize: 14,
			fontWeight: '600',
			minWidth: 20,
			textAlign: 'center'
		},
		emptySubtitle: {
			fontSize: 15,
			textAlign: 'center',
			lineHeight: 22,
			marginBottom: 24
		},
		emptyAction: {
			paddingHorizontal: 32,
			paddingVertical: 14,
			borderRadius: 12,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.2,
			shadowRadius: 8,
			elevation: 4
		},
		emptyActionText: {
			color: '#fff',
			fontSize: 15,
			fontWeight: '700'
		},
		actionButtonsContainer: {
			marginTop: 12,
			flexDirection: 'row',
			gap: 8,
			justifyContent: 'flex-end'
		},
		actionButton: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 6,
			paddingHorizontal: 16,
			paddingVertical: 10,
			borderRadius: 10,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.1,
			shadowRadius: 4,
			elevation: 2
		},
		actionButtonText: {
			color: '#fff',
			fontSize: 13,
			fontWeight: '600'
		},
		checkoutButton: {
			width: 36,
			height: 36,
			borderRadius: 18,
			justifyContent: 'center',
			alignItems: 'center',
			marginLeft: 12,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.15,
			shadowRadius: 4,
			elevation: 3
		}
	})
}

export default PurchasesScreen
