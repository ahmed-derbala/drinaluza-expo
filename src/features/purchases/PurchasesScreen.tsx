import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, useWindowDimensions, ScrollView, Platform, Alert } from 'react-native'

import SmartImage from '@/core/SmartImageViewer'
import { useRouter, useFocusEffect, useLocalSearchParams, Stack, useNavigation } from 'expo-router'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { getItem, setItem } from '@/core/storage'
import { useTheme, createShadow } from '@/core/theme'
import { SmartHeader } from '@/core/smart-header'
import ErrorState from '../common/ErrorState'
import EmptyState from '../common/EmptyState'
import { usePurchasesByStatus } from '../orders/usePurchasesByStatus'
import { getPurchases, updatePurchaseStatus, createPurchase } from '../orders/orders.api'
import { OrderItem } from '../orders/orders.interface'
import { ORDER_STATUSES, orderStatusColors, orderStatusLabels } from '../orders/orders-statuses'
import { useBackButton } from '@/core/hooks/useBackButton'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import { useUser } from '@/core/contexts/UserContext'
import { toast } from '@/features/common/Toast'
import { showConfirm } from '@/core/helpers/popup'
import { FeedItem } from '../feed/feed.interface'

type CartItem = FeedItem & { quantity: number }

interface BusinessCartGroup {
	businessId: string
	businessName: string
	businessSlug: string
	items: CartItem[]
}

export default function PurchasesScreen() {
	const { status } = useLocalSearchParams<{ status?: string }>()
	const router = useRouter()
	const { colors } = useTheme()
	const { translate, localize, user } = useUser()
	const { onScroll } = useScrollHandler()
	const { width } = useWindowDimensions()
	const navigation = useNavigation()
	useBackButton()

	const [selectedStatus, setSelectedStatus] = useState<string>(status || 'cart')
	useEffect(() => {
		setSelectedStatus(status || 'cart')
	}, [status])

	const selectedStatusRef = useRef(selectedStatus)
	useEffect(() => {
		selectedStatusRef.current = selectedStatus
	}, [selectedStatus])

	const [cartState, setCartState] = useState<CartItem[]>([])
	const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})

	const cartStateRef = useRef(cartState)
	useEffect(() => {
		cartStateRef.current = cartState
	}, [cartState])

	const isPurchaseStatus = selectedStatus !== 'cart'
	const {
		data: purchasesResponse,
		isInitialLoading,
		isRefreshing,
		isOffline,
		refresh
	} = usePurchasesByStatus({
		status: selectedStatus,
		skipInitialFetch: !isPurchaseStatus || !user
	})
	const purchaseItems = useMemo(() => {
		if (!purchasesResponse?.data?.docs) return []
		return [...purchasesResponse.data.docs].sort((a: OrderItem, b: OrderItem) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
	}, [purchasesResponse])

	// Responsive Layout
	const isTablet = width >= 768
	const isDesktop = width >= 1024
	const numColumns = isDesktop ? 3 : isTablet ? 2 : 1
	const cardGap = 16

	const statusOptions = useMemo(
		() => [
			{ value: 'cart', label: translate('cart', 'Cart') },
			{ value: 'all', label: translate('all_orders', 'All Orders') },
			{ value: ORDER_STATUSES.PENDING_SHOP_CONFIRMATION, label: orderStatusLabels[ORDER_STATUSES.PENDING_SHOP_CONFIRMATION] },
			{ value: ORDER_STATUSES.CONFIRMED_BY_SHOP, label: orderStatusLabels[ORDER_STATUSES.CONFIRMED_BY_SHOP] },
			{ value: ORDER_STATUSES.RESERVED_BY_SHOP_FOR_PICKUP_BY_CUSTOMER, label: orderStatusLabels[ORDER_STATUSES.RESERVED_BY_SHOP_FOR_PICKUP_BY_CUSTOMER] },
			{ value: ORDER_STATUSES.DELIVERING_TO_CUSTOMER, label: orderStatusLabels[ORDER_STATUSES.DELIVERING_TO_CUSTOMER] },
			{ value: ORDER_STATUSES.DELIVERED_TO_CUSTOMER, label: orderStatusLabels[ORDER_STATUSES.DELIVERED_TO_CUSTOMER] },
			{ value: ORDER_STATUSES.RECEIVED_BY_CUSTOMER, label: orderStatusLabels[ORDER_STATUSES.RECEIVED_BY_CUSTOMER] },
			{ value: ORDER_STATUSES.RESERVATION_EXPIRED, label: orderStatusLabels[ORDER_STATUSES.RESERVATION_EXPIRED] },
			{ value: ORDER_STATUSES.CANCELLED_BY_CUSTOMER, label: orderStatusLabels[ORDER_STATUSES.CANCELLED_BY_CUSTOMER] },
			{ value: ORDER_STATUSES.CANCELLED_BY_SHOP, label: orderStatusLabels[ORDER_STATUSES.CANCELLED_BY_SHOP] }
		],
		[translate]
	)

	const loadAllPurchasesForCounts = useCallback(async () => {
		const counts: Record<string, number> = {
			all: 0,
			cart: 0
		}
		if (user) {
			try {
				const response = await getPurchases()
				if (response && response.data && Array.isArray(response.data.docs)) {
					const docs = response.data.docs
					counts.all = docs.length
					docs.forEach((item) => {
						counts[item.status] = (counts[item.status] || 0) + 1
					})
				}
			} catch (err) {
				console.error('Error loading purchases for counts:', err)
			}
		}
		try {
			const storedCart = await getItem<CartItem[]>('cart')
			counts.cart = storedCart?.length || 0
		} catch (err) {
			console.error('Error loading cart for counts:', err)
		}
		setStatusCounts(counts)
	}, [user])

	const loadCart = useCallback(async () => {
		const storedCart = await getItem<CartItem[]>('cart')
		setCartState(storedCart || [])
	}, [])

	const handleRefresh = useCallback(async () => {
		await loadAllPurchasesForCounts()
		await loadCart()
		if (user && isPurchaseStatus) {
			await refresh()
		}
	}, [loadAllPurchasesForCounts, loadCart, refresh, isPurchaseStatus, user])

	const handleStatusChange = useCallback(
		(newStatus: string) => {
			setSelectedStatus(newStatus)
			router.setParams({ status: newStatus })
		},
		[router]
	)

	useFocusEffect(
		useCallback(() => {
			loadAllPurchasesForCounts()
			loadCart()
			if (user && isPurchaseStatus) {
				refresh()
			}
		}, [loadAllPurchasesForCounts, loadCart, refresh, isPurchaseStatus, user])
	)

	const updateCartQuantity = useCallback(
		async (itemId: string, newQuantity: number) => {
			if (newQuantity < 1) {
				Alert.alert(translate('remove_item', 'Remove Item'), translate('remove_item_confirm', 'Do you want to remove this item from your cart?'), [
					{ text: translate('cancel', 'Cancel'), style: 'cancel' },
					{
						text: translate('confirm', 'Confirm'),
						style: 'destructive',
						onPress: async () => {
							const newCart = cartState.filter((item) => item._id !== itemId)
							setCartState(newCart)
							await setItem('cart', newCart)
							await loadAllPurchasesForCounts()
						}
					}
				])
				return
			}

			const newCart = cartState.map((item) => (item._id === itemId ? { ...item, quantity: newQuantity } : item))
			setCartState(newCart)
			await setItem('cart', newCart)
			await loadAllPurchasesForCounts()
		},
		[cartState, translate, loadAllPurchasesForCounts]
	)

	const removeFromCart = useCallback(
		async (itemId: string) => {
			const newCart = cartState.filter((item) => item._id !== itemId)
			setCartState(newCart)
			await setItem('cart', newCart)
			await loadAllPurchasesForCounts()
		},
		[cartState, loadAllPurchasesForCounts]
	)

	const handleCheckout = useCallback(
		async (group: BusinessCartGroup) => {
			try {
				const products = group.items.map((item) => ({
					product: { _id: item._id, slug: item.slug },
					quantity: item.quantity
				}))

				await createPurchase({
					products,
					business: { slug: group.businessSlug, _id: group.businessId }
				})

				const purchasedItemIds = new Set(group.items.map((item) => item._id))
				const newCart = cartState.filter((item) => !purchasedItemIds.has(item._id))

				setCartState(newCart)
				await setItem('cart', newCart)
				await loadAllPurchasesForCounts()

				toast.show({ title: translate('success', 'Success'), message: translate('checkout_success', 'Order placed successfully!'), color: '#10B981' })
				handleStatusChange(ORDER_STATUSES.PENDING_SHOP_CONFIRMATION)
			} catch (err) {
				console.error('Checkout failed:', err)
				Alert.alert(translate('error', 'Error'), translate('checkout_failed', 'Failed to place order'))
			}
		},
		[cartState, translate, handleStatusChange, loadAllPurchasesForCounts]
	)

	const handleCancelOrder = useCallback(
		(purchaseId: string) => {
			showConfirm(translate('cancel_order', 'Cancel Order'), translate('cancel_order_confirm', 'Are you sure you want to cancel this order?'), async () => {
				try {
					await updatePurchaseStatus({ purchaseId, status: 'cancelled_by_customer' })
					await loadAllPurchasesForCounts()
					await refresh()
					toast.show({ title: translate('success', 'Success'), message: translate('cancel_order_success', 'Order cancelled successfully'), color: '#10B981' })
				} catch (err) {
					console.error('Failed to cancel order:', err)
					toast.show({ title: translate('error', 'Error'), message: translate('cancel_order_failed', 'Failed to cancel order. Please try again.'), color: '#EF4444' })
				}
			})
		},
		[loadAllPurchasesForCounts, refresh, translate]
	)

	const handleStatusUpdate = useCallback(
		async (purchaseId: string, newStatus: string) => {
			try {
				await updatePurchaseStatus({ purchaseId, status: newStatus })
				await loadAllPurchasesForCounts()
				await refresh()
				toast.show({ title: translate('success', 'Success'), message: translate('status_updated', 'Order status updated successfully'), color: '#10B981' })
			} catch (err) {
				console.error('Failed to update order status:', err)
				toast.show({ title: translate('error', 'Error'), message: translate('status_update_failed', 'Failed to update order status. Please try again.'), color: '#EF4444' })
			}
		},
		[loadAllPurchasesForCounts, refresh, translate]
	)

	const getStepIndex = (orderStatus: string) => {
		if (orderStatus === 'pending_business_confirmation') return 0
		if (orderStatus === 'confirmed_by_business') return 1
		if (orderStatus === 'reserved_by_business_for_pickup_by_customer' || orderStatus === 'delivering_to_customer') return 2
		if (orderStatus === 'delivered_to_customer' || orderStatus === 'received_by_customer') return 3
		return -1
	}

	const renderStepTracker = (orderStatus: string) => {
		const stepIndex = getStepIndex(orderStatus)
		if (stepIndex === -1) return null

		const steps = [translate('step_ordered', 'Ordered'), translate('step_confirmed', 'Confirmed'), translate('step_processing', 'Transit'), translate('step_delivered', 'Delivered')]

		return (
			<View style={styles.stepTracker}>
				<View style={[styles.stepLine, { backgroundColor: colors.border + '30' }]} />
				<View style={[styles.stepLineProgress, { backgroundColor: colors.primary, width: `${Math.max(0, Math.min(100, (stepIndex / (steps.length - 1)) * 100))}%` }]} />
				<View style={styles.stepItemsRow}>
					{steps.map((step, idx) => {
						const active = idx <= stepIndex
						const isCurrent = idx === stepIndex
						return (
							<View key={step} style={styles.stepItem}>
								<View
									style={[
										styles.stepDotOuter,
										{
											borderColor: isCurrent ? colors.primary : active ? colors.primary + '50' : 'transparent',
											backgroundColor: isCurrent ? colors.primary + '15' : 'transparent'
										}
									]}
								>
									<View
										style={[
											styles.stepDot,
											{
												backgroundColor: active ? colors.primary : colors.surfaceVariant,
												borderColor: isCurrent ? colors.text : active ? colors.primary : colors.border
											}
										]}
									>
										{active && <Ionicons name="checkmark" size={8} color="#fff" />}
									</View>
								</View>
								<Text style={[styles.stepLabel, { color: active ? colors.text : colors.textSecondary, fontWeight: active ? '700' : '500' }]}>{step}</Text>
							</View>
						)
					})}
				</View>
			</View>
		)
	}

	const cartGroups = useMemo(() => {
		const groupsMap = new Map<string, BusinessCartGroup>()
		cartState.forEach((item) => {
			const bId = item.business?._id || 'unknown'
			const bName = localize(item.business?.name) || 'Unknown Store'
			const bSlug = item.business?.slug || ''

			if (!groupsMap.has(bId)) {
				groupsMap.set(bId, {
					businessId: bId,
					businessName: bName,
					businessSlug: bSlug,
					items: []
				})
			}
			groupsMap.get(bId)!.items.push(item)
		})
		return Array.from(groupsMap.values())
	}, [cartState, localize])

	const displayData = useMemo(() => {
		if (selectedStatus === 'cart') {
			return cartGroups
		}
		return purchaseItems
	}, [selectedStatus, cartGroups, purchaseItems])

	const renderCartGroup = useCallback(
		(group: BusinessCartGroup) => {
			const groupTotal = group.items.reduce((sum, item) => sum + (item.price?.total?.tnd || 0) * (item.quantity || 1), 0)

			return (
				<View style={styles.cardContainer}>
					<View style={[styles.purchaseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<View style={styles.cardHeader}>
							<TouchableOpacity
								style={styles.headerLeft}
								onPress={() => {
									if (group.businessSlug) {
										router.push(`/businesses/${group.businessSlug}` as any)
									}
								}}
							>
								<Ionicons name="storefront-outline" size={24} color={colors.primary} />
								<View style={styles.headerInfo}>
									<Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>
										{group.businessName}
									</Text>
									<Text style={[styles.orderDate, { color: colors.textSecondary }]}>
										{group.items.length} {group.items.length === 1 ? translate('item', 'item') : translate('items', 'items')}
									</Text>
								</View>
							</TouchableOpacity>
							<View style={[styles.statusBadge, { backgroundColor: colors.primary + '15' }]}>
								<Text style={[styles.statusText, { color: colors.primary }]}>{translate('draft', 'DRAFT')}</Text>
							</View>
						</View>

						<View style={[styles.divider, { backgroundColor: colors.border }]} />

						<ScrollView style={styles.productList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
							{group.items.map((item) => {
								const price = item.price?.total?.tnd || 0
								const img = item.media?.thumbnail?.url || item.defaultProduct?.media?.thumbnail?.url
								return (
									<View key={item._id} style={styles.cartItemRow}>
										<TouchableOpacity
											onPress={() => {
												if (item.slug) {
													router.push(`/products/${item.slug}` as any)
												}
											}}
										>
											<SmartImage source={img} style={styles.productThumb} entityType="product" />
										</TouchableOpacity>
										<View style={styles.cartItemDetails}>
											<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
												<TouchableOpacity
													style={{ flex: 1, marginRight: 8 }}
													onPress={() => {
														if (item.slug) {
															router.push(`/products/${item.slug}` as any)
														}
													}}
												>
													<Text style={[styles.productNameText, { color: colors.text }]} numberOfLines={1}>
														{localize(item.name)}
													</Text>
												</TouchableOpacity>
												<TouchableOpacity onPress={() => removeFromCart(item._id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
													<Ionicons name="trash-outline" size={16} color={colors.error} />
												</TouchableOpacity>
											</View>

											<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
												<Text style={[styles.productPriceText, { color: colors.primary }]}>{(price * item.quantity).toFixed(2)} TND</Text>

												<View style={[styles.qtyRow, { backgroundColor: colors.surfaceVariant }]}>
													<TouchableOpacity onPress={() => updateCartQuantity(item._id, item.quantity - 1)} style={styles.qtyBtn}>
														<Ionicons name="remove" size={14} color={colors.text} />
													</TouchableOpacity>
													<Text style={[styles.qtyVal, { color: colors.text }]}>{item.quantity}</Text>
													<TouchableOpacity onPress={() => updateCartQuantity(item._id, item.quantity + 1)} style={styles.qtyBtn}>
														<Ionicons name="add" size={14} color={colors.text} />
													</TouchableOpacity>
												</View>
											</View>
										</View>
									</View>
								)
							})}
						</ScrollView>

						<View style={[styles.divider, { backgroundColor: colors.border }]} />

						<View style={styles.cardFooter}>
							<View>
								<Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{translate('total', 'Total')}</Text>
								<Text style={[styles.totalPrice, { color: colors.primary }]}>{groupTotal.toFixed(2)} TND</Text>
							</View>
							<TouchableOpacity onPress={() => handleCheckout(group)} activeOpacity={0.75} style={styles.checkoutBtn} accessibilityLabel="Place order" accessibilityRole="button">
								<Ionicons name="checkmark-circle" size={36} color={colors.success} />
							</TouchableOpacity>
						</View>
					</View>
				</View>
			)
		},
		[colors, localize, translate, router, removeFromCart, updateCartQuantity, handleCheckout, styles]
	)

	const renderPurchaseItem = useCallback(
		(item: OrderItem) => {
			const statusColor = orderStatusColors[item.status] || colors.textSecondary
			const totalPrice = item.price?.total?.tnd || 0

			return (
				<View style={styles.cardContainer}>
					<View style={[styles.purchaseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<View style={styles.cardHeader}>
							<TouchableOpacity
								style={styles.headerLeft}
								onPress={() => {
									if (item.business.slug) {
										router.push(`/businesses/${item.business.slug}` as any)
									}
								}}
							>
								<SmartImage source={item.business.media?.thumbnail?.url} style={styles.businessAvatar} entityType="business" />
								<View style={styles.headerInfo}>
									<Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>
										{localize(item.business.name)}
									</Text>
									<Text style={[styles.orderDate, { color: colors.textSecondary }]}>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
								</View>
							</TouchableOpacity>
							<View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
								<Text style={[styles.statusText, { color: statusColor }]}>{orderStatusLabels[item.status] || item.status}</Text>
							</View>
						</View>

						<View style={[styles.divider, { backgroundColor: colors.border }]} />

						<ScrollView style={styles.productList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
							{item.products.map((p, idx) => {
								const img = p.product.media?.thumbnail?.url || p.product.defaultProduct?.media?.thumbnail?.url
								return (
									<TouchableOpacity
										key={`${p.product._id}-${idx}`}
										style={styles.productRow}
										onPress={() => {
											if (p.product.slug) {
												router.push(`/products/${p.product.slug}` as any)
											}
										}}
									>
										<SmartImage source={img} style={styles.productThumb} entityType="product" />
										<View style={styles.productInfoWrap}>
											<Text style={[styles.productNameText, { color: colors.text }]} numberOfLines={1}>
												{localize(p.product.name)}
											</Text>
											<Text style={[styles.productQtyText, { color: colors.textSecondary }]}>
												{p.quantity} × {p.product.unit?.measure || translate('unit', 'unit')}
											</Text>
										</View>
										<Text style={[styles.productPriceText, { color: colors.primary }]}>{(p.lineTotal?.tnd || 0).toFixed(2)} TND</Text>
									</TouchableOpacity>
								)
							})}
						</ScrollView>

						{renderStepTracker(item.status)}

						<View style={[styles.divider, { backgroundColor: colors.border }]} />

						<View style={styles.cardFooter}>
							<View>
								<Text style={[styles.orderNumberLabel, { color: colors.textSecondary }]}>{translate('order_id', 'Order ID')}</Text>
								<Text style={[styles.orderNumberValue, { color: colors.textSecondary }]}>#{item._id.slice(-8)}</Text>
							</View>
							<View style={{ alignItems: 'flex-end' }}>
								<Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{translate('total', 'Total')}</Text>
								<Text style={[styles.totalPrice, { color: colors.primary }]}>{totalPrice.toFixed(2)} TND</Text>
							</View>
						</View>

						<View style={styles.actionsRow}>
							{item.status === 'pending_business_confirmation' && (
								<TouchableOpacity style={[styles.actionBtn, { borderColor: colors.error, backgroundColor: colors.error + '10' }]} onPress={() => handleCancelOrder(item._id)} activeOpacity={0.8}>
									<Ionicons name="close-circle-outline" size={18} color={colors.error} />
									<Text style={[styles.actionBtnText, { color: colors.error }]}>{translate('cancel', 'Cancel')}</Text>
								</TouchableOpacity>
							)}
							{item.status === 'delivered_to_customer' && (
								<TouchableOpacity
									style={[styles.actionBtn, { borderColor: colors.success, backgroundColor: colors.success + '10' }]}
									onPress={() => handleStatusUpdate(item._id, 'received_by_customer')}
									activeOpacity={0.8}
								>
									<Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
									<Text style={[styles.actionBtnText, { color: colors.success }]}>{translate('mark_as_received', 'Mark Received')}</Text>
								</TouchableOpacity>
							)}
						</View>
					</View>
				</View>
			)
		},
		[colors, localize, translate, router, handleCancelOrder, handleStatusUpdate, styles]
	)

	const renderItem = useCallback(
		({ item }: { item: any }) => {
			if (selectedStatus === 'cart') {
				return <View style={[numColumns > 1 ? styles.columnItem : styles.fullWidthItem, numColumns > 1 && { paddingHorizontal: 8, marginBottom: 16 }]}>{renderCartGroup(item)}</View>
			}
			return <View style={[numColumns > 1 ? styles.columnItem : styles.fullWidthItem, numColumns > 1 && { paddingHorizontal: 8, marginBottom: 16 }]}>{renderPurchaseItem(item)}</View>
		},
		[selectedStatus, numColumns, renderCartGroup, renderPurchaseItem, styles.columnItem, styles.fullWidthItem]
	)

	if (isInitialLoading) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	const itemCount = statusCounts[selectedStatus] || 0

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen
				options={{
					headerShown: false
				}}
			/>

			<SmartHeader
				navigation={navigation}
				title={translate('purchases_title', 'Purchases')}
				subtitle={itemCount > 0 ? `${itemCount} ${itemCount === 1 ? translate('item', 'item') : translate('items', 'items')}` : undefined}
				back={navigation.canGoBack() ? { title: 'Back' } : undefined}
				headerBottomHeight={52}
				options={{
					onRefresh: handleRefresh,
					isRefreshing: isRefreshing
				}}
				headerActions={['refresh']}
				headerBottom={
					<View style={[styles.filterContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border, height: 52, borderBottomWidth: 0, paddingVertical: 0 }]}>
						<ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === 'web'} contentContainerStyle={styles.filterRow} style={styles.filterScroll} keyboardShouldPersistTaps="handled">
							{statusOptions.map((opt) => {
								const isSelected = selectedStatus === opt.value
								const count = statusCounts[opt.value] ?? 0
								const showCount = count > 0 || opt.value === 'cart'

								return (
									<TouchableOpacity
										key={opt.value}
										onPress={() => handleStatusChange(opt.value)}
										activeOpacity={0.75}
										style={[
											styles.filterChip,
											{
												backgroundColor: isSelected ? colors.primary + '15' : colors.card,
												borderColor: isSelected ? colors.primary : colors.border,
												...Platform.select({
													web: {
														boxShadow: isSelected ? `0 2px 8px ${colors.primary}20` : '0 1px 3px rgba(0, 0, 0, 0.05)'
													}
												})
											}
										]}
									>
										{isRefreshing && isSelected && <ActivityIndicator size="small" color={colors.primary} style={styles.filterLoader} />}
										<Text
											style={[
												styles.filterChipText,
												{
													color: isSelected ? colors.primary : colors.textSecondary,
													fontWeight: isSelected ? '700' : '600'
												}
											]}
											numberOfLines={1}
										>
											{opt.label}
										</Text>
										{showCount && (
											<View
												style={[
													styles.countBadge,
													{
														backgroundColor: isSelected ? colors.primary : colors.border
													}
												]}
											>
												<Text
													style={[
														styles.countText,
														{
															color: isSelected ? colors.textOnPrimary || '#fff' : colors.textSecondary
														}
													]}
												>
													{count}
												</Text>
											</View>
										)}
									</TouchableOpacity>
								)
							})}
						</ScrollView>
					</View>
				}
			/>

			{isOffline && displayData.length === 0 ? (
				<ErrorState icon="cloud-offline-outline" iconOnly />
			) : (
				<SmartHeader.FlashList
					data={displayData}
					renderItem={renderItem}
					keyExtractor={(item: any) => item._id || item.businessId}
					key={numColumns}
					numColumns={numColumns}
					contentContainerStyle={[styles.listContent, numColumns > 1 && { paddingHorizontal: 8 }]}
					refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
					ListEmptyComponent={
						isInitialLoading ? (
							<View style={styles.emptyContainer}>
								<ActivityIndicator size="large" color={colors.primary} />
							</View>
						) : (
							<View style={styles.emptyContainer}>
								<MaterialIcons name="receipt-long" size={64} color={colors.textTertiary} style={{ opacity: 0.3 }} />
								<Text style={[styles.emptyTitle, { color: colors.text }]}>
									{selectedStatus === 'cart' ? translate('empty_cart', 'Your cart is empty') : translate('no_purchases_found', 'No purchases found')}
								</Text>
								<Text style={[styles.emptyText, { color: colors.textSecondary }]}>
									{selectedStatus === 'cart'
										? translate('empty_cart_sub', 'Add seafood items to your cart!')
										: selectedStatus !== 'all'
											? `No purchases with status "${orderStatusLabels[selectedStatus as keyof typeof orderStatusLabels] || selectedStatus}"`
											: 'Your seafood purchases will appear here.'}
								</Text>
							</View>
						)
					}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	filterContainer: {
		height: 52,
		paddingHorizontal: 4,
		justifyContent: 'center'
	},
	filterScroll: {
		flexGrow: 0,
		width: '100%'
	},
	filterRow: {
		paddingHorizontal: 12,
		gap: 8,
		alignItems: 'center'
	},
	filterChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		borderWidth: 1.5,
		minHeight: 36,
		gap: 6,
		...createShadow({ offsetY: 1, opacity: 0.05, radius: 2, elevation: 1 })
	},
	filterLoader: {
		marginRight: -2
	},
	filterChipText: {
		fontSize: 13,
		letterSpacing: 0.1
	},
	countBadge: {
		paddingHorizontal: 6,
		paddingVertical: 1,
		borderRadius: 10,
		minWidth: 20,
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: 2
	},
	countText: {
		fontSize: 10,
		fontWeight: '700',
		lineHeight: 14
	},
	listContent: {
		padding: 16,
		flexGrow: 1
	},
	columnItem: {
		flex: 1,
		minWidth: 0
	},
	fullWidthItem: {
		width: '100%'
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 48,
		minHeight: 300
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: '700',
		textAlign: 'center',
		marginTop: 16,
		marginBottom: 8
	},
	emptyText: {
		fontSize: 15,
		textAlign: 'center',
		lineHeight: 22
	},
	cardContainer: {
		width: '100%',
		marginBottom: 16
	},
	purchaseCard: {
		borderRadius: 28,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.06)',
		padding: 22,
		minHeight: 320,
		justifyContent: 'space-between',
		...createShadow({ offsetY: 12, opacity: 0.1, radius: 24, elevation: 4 })
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		gap: 12
	},
	businessAvatar: {
		width: 46,
		height: 46,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.08)'
	},
	headerInfo: {
		flex: 1,
		minWidth: 0
	},
	businessName: {
		fontSize: 16,
		fontWeight: '800',
		letterSpacing: -0.3
	},
	orderDate: {
		fontSize: 12,
		fontWeight: '500',
		marginTop: 2
	},
	statusBadge: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12
	},
	statusText: {
		fontSize: 10,
		fontWeight: '800',
		textTransform: 'uppercase',
		letterSpacing: 0.3
	},
	divider: {
		height: 1,
		marginVertical: 18,
		opacity: 0.4
	},
	productList: {
		maxHeight: 180,
		flexGrow: 0
	},
	productRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginBottom: 12
	},
	productThumb: {
		width: 56,
		height: 56,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#FFFFFF08'
	},
	productInfoWrap: {
		flex: 1,
		minWidth: 0
	},
	productNameText: {
		fontSize: 15,
		fontWeight: '700',
		letterSpacing: -0.2
	},
	productQtyText: {
		fontSize: 12,
		fontWeight: '500',
		marginTop: 2
	},
	productPriceText: {
		fontSize: 15,
		fontWeight: '800',
		letterSpacing: -0.1
	},
	stepTracker: {
		marginVertical: 20,
		position: 'relative',
		height: 42,
		justifyContent: 'center'
	},
	stepLine: {
		position: 'absolute',
		top: 11,
		left: 28,
		right: 28,
		height: 3,
		borderRadius: 1.5
	},
	stepLineProgress: {
		position: 'absolute',
		top: 11,
		left: 28,
		height: 3,
		borderRadius: 1.5
	},
	stepItemsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	stepItem: {
		alignItems: 'center',
		width: 64
	},
	stepDotOuter: {
		width: 24,
		height: 24,
		borderRadius: 12,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	stepDot: {
		width: 14,
		height: 14,
		borderRadius: 7,
		borderWidth: 2,
		justifyContent: 'center',
		alignItems: 'center'
	},
	stepLabel: {
		fontSize: 9,
		textAlign: 'center',
		marginTop: 8,
		letterSpacing: -0.1
	},
	cardFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	orderNumberLabel: {
		fontSize: 10,
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.3
	},
	orderNumberValue: {
		fontSize: 13,
		fontWeight: '600',
		marginTop: 2
	},
	totalLabel: {
		fontSize: 10,
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.3
	},
	totalPrice: {
		fontSize: 22,
		fontWeight: '900',
		marginTop: 2,
		letterSpacing: -0.5
	},
	actionsRow: {
		flexDirection: 'row',
		gap: 10,
		marginTop: 16
	},
	actionBtn: {
		flex: 1,
		flexDirection: 'row',
		height: 46,
		borderRadius: 14,
		borderWidth: 1.5,
		justifyContent: 'center',
		alignItems: 'center',
		gap: 8
	},
	actionBtnText: {
		fontSize: 13,
		fontWeight: '700'
	},
	cartItemRow: {
		flexDirection: 'row',
		gap: 14,
		marginBottom: 18,
		padding: 10,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.04)',
		backgroundColor: 'rgba(255, 255, 255, 0.01)'
	},
	cartItemDetails: {
		flex: 1,
		minWidth: 0,
		justifyContent: 'space-between'
	},
	qtyRow: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 2,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.06)'
	},
	qtyBtn: {
		width: 28,
		height: 28,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center'
	},
	qtyVal: {
		fontSize: 12,
		fontWeight: '700',
		minWidth: 20,
		textAlign: 'center'
	},
	checkoutBtn: {
		justifyContent: 'center',
		alignItems: 'center'
	}
})
