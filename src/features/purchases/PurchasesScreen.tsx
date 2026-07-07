import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, useWindowDimensions, ScrollView, Platform, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import SmartImage from '@/core/SmartImageViewer'
import { useRouter, useFocusEffect, useLocalSearchParams, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getItem, setItem } from '@/core/storage'
import { FlashList } from '@shopify/flash-list'
import { useTheme, createShadow } from '../../core/theme'
import { HeaderRefreshButton, SmartHeader } from '@/core/smart-header'
import ErrorState from '../common/ErrorState'
import EmptyState from '../common/EmptyState'
import { getPurchases, updatePurchaseStatus, createPurchase } from '../orders/orders.api'
import { OrderItem } from '../orders/orders.interface'
import { orderStatusEnum, orderStatusColors, orderStatusLabels } from '../orders/orderStatus'
import { useBackButton } from '../../core/hooks/useBackButton'
import { useScrollHandler } from '../../core/hooks/useScrollHandler'
import { parseError, logError } from '../../core/helpers/errorHandler'
import { useUser } from '../../core/contexts/UserContext'
import { toast } from '@/features/common/Toast'
import { showConfirm } from '../../core/helpers/popup'
import { FeedItem } from '../feed/feed.interface'

type FilterStatus = 'cart' | 'pending' | 'processing' | 'completed' | 'cancelled'
type CartItem = FeedItem & { quantity: number }
type BusinessCartGroup = {
	businessId: string
	businessName: string
	businessSlug: string
	items: CartItem[]
}

const PurchasesScreen = () => {
	const { colors } = useTheme()
	const router = useRouter()
	const params = useLocalSearchParams<{ status?: FilterStatus }>()
	const insets = useSafeAreaInsets()
	const [filter, setFilter] = useState<FilterStatus>(params.status || 'cart')

	useEffect(() => {
		if (params.status) {
			setFilter(params.status)
		}
	}, [params.status])

	const [purchasesState, setPurchasesState] = useState<Record<Exclude<FilterStatus, 'cart'>, OrderItem[]>>({
		pending: [],
		processing: [],
		completed: [],
		cancelled: []
	})
	const purchasesStateRef = useRef(purchasesState)
	useEffect(() => {
		purchasesStateRef.current = purchasesState
	}, [purchasesState])

	const [cart, setCart] = useState<CartItem[]>([])
	const [initialLoading, setInitialLoading] = useState(true)
	const [tabLoading, setTabLoading] = useState<Record<FilterStatus, boolean>>({
		cart: false,
		pending: false,
		processing: false,
		completed: false,
		cancelled: false
	})
	const [refreshing, setRefreshing] = useState(false)
	const [countsState, setCountsState] = useState<Record<string, number>>({ pending: 0, processing: 0, completed: 0, cancelled: 0 })
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)

	const { translate, localize } = useUser()
	const { onScroll } = useScrollHandler()
	const { width } = useWindowDimensions()

	useBackButton()

	// Responsive Layout parameters
	const isTablet = width >= 768
	const isDesktop = width >= 1024
	const numColumns = isDesktop ? 3 : isTablet ? 2 : 1
	const cardGap = 16
	const padding = 16
	const styles = useMemo(() => createStyles(colors, width, numColumns, cardGap), [colors, width, numColumns])

	const loadCart = async () => {
		try {
			const storedCart = await getItem<CartItem[]>('cart')
			if (storedCart) {
				setCart(storedCart)
			} else {
				setCart([])
			}
		} catch (err) {
			console.error('Failed to load cart:', err)
		}
	}

	const loadStatusCounts = useCallback(async () => {
		try {
			const res = await getPurchases()
			const docs = res.data?.docs || []
			const counts: Record<string, number> = { pending: 0, processing: 0, completed: 0, cancelled: 0 }

			docs.forEach((item) => {
				const status = item.status
				if (status === 'pending_business_confirmation') {
					counts.pending++
				} else if (status === 'confirmed_by_business' || status === 'reserved_by_business_for_pickup_by_customer' || status === 'delivering_to_customer') {
					counts.processing++
				} else if (status === 'delivered_to_customer' || status === 'received_by_customer') {
					counts.completed++
				} else if (status === 'cancelled_by_customer' || status === 'cancelled_by_business' || status === 'reservation_expired') {
					counts.cancelled++
				}
			})

			setCountsState(counts)
		} catch (err) {
			console.error('Failed to load status counts:', err)
		}
	}, [])

	const fetchPurchases = useCallback(async (activeFilter: FilterStatus, isRefresh = false) => {
		if (activeFilter === 'cart') {
			await loadCart()
			setTabLoading((prev) => ({ ...prev, cart: false }))
			setInitialLoading(false)
			setRefreshing(false)
			return
		}

		try {
			// Only show loading spinner if we don't have data for this tab yet
			if (!isRefresh && !purchasesStateRef.current[activeFilter]?.length) {
				setTabLoading((prev) => ({ ...prev, [activeFilter]: true }))
			}
			setError(null)
			let docs: OrderItem[] = []

			if (activeFilter === 'pending') {
				const res = await getPurchases('pending_business_confirmation')
				docs = res.data?.docs || []
			} else if (activeFilter === 'processing') {
				const results = await Promise.all([
					getPurchases('confirmed_by_business').catch(() => null),
					getPurchases('reserved_by_business_for_pickup_by_customer').catch(() => null),
					getPurchases('delivering_to_customer').catch(() => null)
				])
				docs = results.flatMap((res) => res?.data?.docs || [])
			} else if (activeFilter === 'completed') {
				const results = await Promise.all([getPurchases('delivered_to_customer').catch(() => null), getPurchases('received_by_customer').catch(() => null)])
				docs = results.flatMap((res) => res?.data?.docs || [])
			} else if (activeFilter === 'cancelled') {
				const results = await Promise.all([
					getPurchases('cancelled_by_customer').catch(() => null),
					getPurchases('cancelled_by_business').catch(() => null),
					getPurchases('reservation_expired').catch(() => null)
				])
				docs = results.flatMap((res) => res?.data?.docs || [])
			}

			// Sort by creation date descending
			docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
			setPurchasesState((prev) => ({ ...prev, [activeFilter]: docs }))
		} catch (err: any) {
			logError(err, 'fetchPurchases')
			const errorInfo = parseError(err)
			setError({
				title: errorInfo.title,
				message: errorInfo.message,
				type: errorInfo.type
			})
		} finally {
			setTabLoading((prev) => ({ ...prev, [activeFilter]: false }))
			setInitialLoading(false)
			setRefreshing(false)
		}
	}, [])

	const onRefresh = useCallback(async () => {
		setRefreshing(true)
		await Promise.all([fetchPurchases(filter, true), loadStatusCounts(), loadCart()])
	}, [filter, fetchPurchases, loadStatusCounts])

	// Initial data loading on component mount
	useEffect(() => {
		const loadInitialData = async () => {
			await Promise.all([loadStatusCounts(), loadCart()])
		}
		loadInitialData()
	}, [])

	// Tab switching loads active tab data silently or with localized spinner if empty
	useEffect(() => {
		fetchPurchases(filter)
	}, [filter, fetchPurchases])

	// Refresh cart and counts when screen comes into focus
	useFocusEffect(
		useCallback(() => {
			loadCart()
			loadStatusCounts()
		}, [loadStatusCounts])
	)

	const handleCancelOrder = useCallback(
		(purchaseId: string) => {
			showConfirm(translate('cancel_order', 'Cancel Order'), translate('cancel_order_confirm', 'Are you sure you want to cancel this order?'), async () => {
				try {
					await updatePurchaseStatus({ purchaseId, status: 'cancelled_by_customer' })
					await Promise.all([fetchPurchases(filter, true), loadStatusCounts()])
					toast.show({ title: translate('success', 'Success'), message: translate('cancel_order_success', 'Order cancelled successfully'), color: '#10B981' })
				} catch (err) {
					console.error('Failed to cancel order:', err)
					toast.show({ title: translate('error', 'Error'), message: translate('cancel_order_failed', 'Failed to cancel order. Please try again.'), color: '#EF4444' })
				}
			})
		},
		[filter, fetchPurchases, loadStatusCounts, translate]
	)

	const handleStatusUpdate = useCallback(
		async (purchaseId: string, newStatus: string) => {
			try {
				await updatePurchaseStatus({ purchaseId, status: newStatus })
				await Promise.all([fetchPurchases(filter, true), loadStatusCounts()])
				toast.show({ title: translate('success', 'Success'), message: translate('status_updated', 'Order status updated successfully'), color: '#10B981' })
			} catch (err) {
				console.error('Failed to update order status:', err)
				toast.show({ title: translate('error', 'Error'), message: translate('status_update_failed', 'Failed to update order status. Please try again.'), color: '#EF4444' })
			}
		},
		[filter, fetchPurchases, loadStatusCounts, translate]
	)

	const groupedCart = useMemo(() => {
		const groups: { [key: string]: BusinessCartGroup } = {}
		cart.forEach((item) => {
			const businessId = item.business?._id || 'unknown'
			if (!groups[businessId]) {
				groups[businessId] = {
					businessId: businessId,
					businessName: localize(item.business?.name) || translate('unnamed_business', 'Unnamed Business'),
					businessSlug: item.business?.slug || 'unknown',
					items: []
				}
			}
			groups[businessId].items.push(item)
		})
		return Object.values(groups)
	}, [cart, localize, translate])

	const getStepIndex = (status: string) => {
		if (status === 'pending_business_confirmation') return 0
		if (status === 'confirmed_by_business') return 1
		if (status === 'reserved_by_business_for_pickup_by_customer' || status === 'delivering_to_customer') return 2
		if (status === 'delivered_to_customer' || status === 'received_by_customer') return 3
		return -1
	}

	const renderStepTracker = (status: string) => {
		const stepIndex = getStepIndex(status)
		if (stepIndex === -1) return null

		const steps = [translate('step_ordered', 'Ordered'), translate('step_confirmed', 'Confirmed'), translate('step_processing', 'Transit'), translate('step_delivered', 'Delivered')]

		return (
			<View style={styles.stepTracker}>
				<View style={[styles.stepLine, { backgroundColor: colors.border }]} />
				<View style={[styles.stepLineProgress, { backgroundColor: colors.primary, width: `${(stepIndex / (steps.length - 1)) * 100}%` }]} />
				<View style={styles.stepItemsRow}>
					{steps.map((step, idx) => {
						const active = idx <= stepIndex
						const isCurrent = idx === stepIndex
						return (
							<View key={step} style={styles.stepItem}>
								<View
									style={[
										styles.stepDot,
										{
											backgroundColor: active ? colors.primary : colors.surface,
											borderColor: isCurrent ? colors.text : active ? colors.primary : colors.border
										}
									]}
								>
									{active && <Ionicons name="checkmark" size={10} color="#fff" />}
								</View>
								<Text style={[styles.stepLabel, { color: active ? colors.text : colors.textSecondary, fontWeight: active ? '700' : '500' }]}>{step}</Text>
							</View>
						)
					})}
				</View>
			</View>
		)
	}

	const renderPurchaseItem = useCallback(
		({ item }: { item: OrderItem }) => {
			const statusColor = orderStatusColors[item.status] || colors.textSecondary
			const totalPrice = item.price?.total?.tnd || 0

			return (
				<View style={styles.cardContainer}>
					<View style={[styles.purchaseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
						{/* Header */}
						<View style={styles.cardHeader}>
							<TouchableOpacity
								style={styles.headerLeft}
								onPress={() => {
									if (item.business.slug) {
										router.push(`/businesses/${item.business.slug}` as any)
									}
								}}
							>
								<SmartImage source={(item.business as any).media?.thumbnail?.url} style={styles.businessAvatar} entityType="business" />
								<View style={styles.headerInfo}>
									<Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>
										{localize(item.business.name)}
									</Text>
									<Text style={[styles.orderDate, { color: colors.textTertiary }]}>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
								</View>
							</TouchableOpacity>
							<View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
								<Text style={[styles.statusText, { color: statusColor }]}>{orderStatusLabels[item.status] || item.status}</Text>
							</View>
						</View>

						{/* Divider */}
						<View style={[styles.divider, { backgroundColor: colors.border }]} />

						{/* Product Details Inline Scroll */}
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

						{/* Step Tracker */}
						{renderStepTracker(item.status)}

						{/* Divider */}
						<View style={[styles.divider, { backgroundColor: colors.border }]} />

						{/* Footer */}
						<View style={styles.cardFooter}>
							<View>
								<Text style={[styles.orderNumberLabel, { color: colors.textTertiary }]}>{translate('order_id', 'Order ID')}</Text>
								<Text style={[styles.orderNumberValue, { color: colors.textSecondary }]}>#{item._id.slice(-8)}</Text>
							</View>
							<View style={{ alignItems: 'flex-end' }}>
								<Text style={[styles.totalLabel, { color: colors.textTertiary }]}>{translate('total', 'Total')}</Text>
								<Text style={[styles.totalPrice, { color: colors.primary }]}>{totalPrice.toFixed(2)} TND</Text>
							</View>
						</View>

						{/* Action Buttons */}
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
		[colors, localize, translate, handleCancelOrder, handleStatusUpdate, styles]
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
							const newCart = cart.filter((item) => item._id !== itemId)
							setCart(newCart)
							await setItem('cart', newCart)
						}
					}
				])
				return
			}

			const newCart = cart.map((item) => (item._id === itemId ? { ...item, quantity: newQuantity } : item))
			setCart(newCart)
			await setItem('cart', newCart)
		},
		[cart, translate]
	)

	const removeFromCart = useCallback(
		async (itemId: string) => {
			const newCart = cart.filter((item) => item._id !== itemId)
			setCart(newCart)
			await setItem('cart', newCart)
		},
		[cart]
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
				const newCart = cart.filter((item) => !purchasedItemIds.has(item._id))

				setCart(newCart)
				await setItem('cart', newCart)

				toast.show({ title: translate('success', 'Success'), message: translate('checkout_success', 'Order placed successfully!'), color: '#10B981' })
				setFilter('pending')
				router.setParams({ status: 'pending' })
			} catch (err) {
				console.error('Checkout failed:', err)
				Alert.alert(translate('error', 'Error'), translate('checkout_failed', 'Failed to place order'))
			}
		},
		[cart, translate, router]
	)

	const renderCartGroup = useCallback(
		({ item: group }: { item: BusinessCartGroup }) => {
			const groupTotal = group.items.reduce((sum, item) => sum + (item.price?.total?.tnd || 0) * (item.quantity || 1), 0)

			return (
				<View style={styles.cardContainer}>
					<View style={[styles.purchaseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
						{/* Header */}
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

						{/* Divider */}
						<View style={[styles.divider, { backgroundColor: colors.border }]} />

						{/* Cart Items List */}
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

						{/* Divider */}
						<View style={[styles.divider, { backgroundColor: colors.border }]} />

						{/* Footer Checkout */}
						<View style={styles.cardFooter}>
							<View>
								<Text style={[styles.totalLabel, { color: colors.textTertiary }]}>{translate('total', 'Total')}</Text>
								<Text style={[styles.totalPrice, { color: colors.primary }]}>{groupTotal.toFixed(2)} TND</Text>
							</View>
							<TouchableOpacity style={[styles.checkoutBtn, { backgroundColor: colors.primary }]} onPress={() => handleCheckout(group)} activeOpacity={0.85}>
								<Ionicons name="cart-outline" size={18} color="#fff" />
								<Text style={styles.checkoutBtnText}>{translate('checkout', 'Checkout')}</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			)
		},
		[colors, localize, translate, updateCartQuantity, removeFromCart, handleCheckout, styles]
	)

	const renderEmptyState = useCallback(() => {
		if (tabLoading[filter]) {
			return (
				<View style={styles.emptyWrap}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			)
		}

		const configs = {
			cart: { icon: 'cart-outline', title: translate('empty_cart', 'Your cart is empty'), sub: translate('empty_cart_sub', 'Add delicious fresh seafood items to your cart!') },
			pending: { icon: 'hourglass-outline', title: translate('empty_pending', 'No pending orders'), sub: translate('empty_pending_sub', 'Orders waiting for business confirmation will appear here') },
			processing: { icon: 'sync-outline', title: translate('empty_processing', 'No active orders'), sub: translate('empty_processing_sub', 'Orders in transit or preparation appear here') },
			completed: {
				icon: 'checkmark-circle-outline',
				title: translate('empty_completed', 'No completed orders'),
				sub: translate('empty_completed_sub', 'Seafood orders you received safely appear here')
			},
			cancelled: { icon: 'close-circle-outline', title: translate('empty_cancelled', 'No cancelled orders'), sub: translate('empty_cancelled_sub', 'Cancelled or expired orders appear here') }
		}
		const config = configs[filter] || configs.cart
		return <EmptyState title={config.title} subtitle={config.sub} iconName={config.icon} style={styles.emptyWrap} />
	}, [filter, translate, styles, tabLoading])

	const FilterButton = ({ status, label, icon }: { status: FilterStatus; label: string; icon: string }) => {
		const isActive = filter === status
		const count = useMemo(() => {
			if (status === 'cart') return cart.length
			return countsState[status] || 0
		}, [status, cart.length])

		return (
			<TouchableOpacity
				style={[
					styles.filterTabBtn,
					{
						backgroundColor: isActive ? colors.primary + '15' : colors.card,
						borderColor: isActive ? colors.primary : colors.border
					}
				]}
				onPress={() => {
					setFilter(status)
					router.setParams({ status })
				}}
				activeOpacity={0.8}
			>
				<Ionicons name={icon as any} size={18} color={isActive ? colors.primary : colors.textSecondary} />
				<Text style={[styles.filterTabText, { color: isActive ? colors.primary : colors.textSecondary, fontWeight: isActive ? '700' : '600' }]}>{label}</Text>
				{count > 0 && (
					<View style={[styles.countBadge, { backgroundColor: isActive ? colors.primary : colors.surfaceVariant }]}>
						<Text style={[styles.countText, { color: isActive ? '#fff' : colors.textSecondary }]}>{count}</Text>
					</View>
				)}
			</TouchableOpacity>
		)
	}

	if (initialLoading) {
		return (
			<View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
				<Stack.Screen options={{ title: translate('purchases_title', 'Purchases') }} />
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	const displayData = filter === 'cart' ? groupedCart : purchasesState[filter]
	const itemCount = displayData.length

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen
				options={
					{
						title: translate('purchases_title', 'Purchases'),
						subtitle: `${itemCount} ${itemCount === 1 ? translate('item', 'item') : translate('items', 'items')}`,
						headerBottomHeight: 52,
						headerBottom: (
							<View style={[styles.filterContainer, { backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={Platform.OS === 'web'}
									contentContainerStyle={styles.filterScrollRow}
									style={styles.filterScroll}
									keyboardShouldPersistTaps="handled"
								>
									<FilterButton status="cart" label={translate('cart', 'Cart')} icon="cart-outline" />
									<FilterButton status="pending" label={translate('pending', 'Pending')} icon="hourglass-outline" />
									<FilterButton status="processing" label={translate('active', 'Active')} icon="sync-outline" />
									<FilterButton status="completed" label={translate('done', 'Done')} icon="checkmark-circle-outline" />
									<FilterButton status="cancelled" label={translate('cancelled', 'Cancelled')} icon="close-outline" />
								</ScrollView>
							</View>
						),
						headerActions: [
							{
								key: 'refresh',
								onPress: onRefresh,
								isRefreshing: refreshing,
								accessibilityLabel: 'Refresh'
							}
						]
					} as any
				}
			/>

			{/* Grid container */}
			<SmartHeader.FlashList
				key={numColumns}
				data={displayData}
				numColumns={numColumns}
				renderItem={filter === 'cart' ? (renderCartGroup as any) : renderPurchaseItem}
				keyExtractor={(item: any) => (filter === 'cart' ? item.businessId : item._id)}
				contentContainerStyle={[styles.listContainer, numColumns > 1 && { paddingHorizontal: padding - cardGap / 2 }]}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
				ListEmptyComponent={renderEmptyState}
				showsVerticalScrollIndicator={false}
				onScroll={onScroll}
				scrollEventThrottle={16}
			/>
		</View>
	)
}

const createStyles = (colors: any, width: number, numColumns: number, cardGap: number) => {
	const padding = 16
	const containerWidth = (numColumns === 1 ? '100%' : `${(100 - (numColumns - 1) * (cardGap / (width - padding * 2)) * 100) / numColumns}%`) as any

	return StyleSheet.create({
		container: { flex: 1 },
		centered: { justifyContent: 'center', alignItems: 'center' },
		filterContainer: {
			height: 52,
			width: '100%',
			justifyContent: 'center'
		},
		filterScroll: {
			flexGrow: 0,
			width: '100%'
		},
		filterScrollRow: { paddingHorizontal: 16, paddingVertical: 0, gap: 10, alignItems: 'center' },
		filterTabBtn: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingHorizontal: 14,
			paddingVertical: 9,
			borderRadius: 20,
			borderWidth: 1.5,
			gap: 8,
			...createShadow({ offsetY: 2, opacity: 0.05, radius: 4, elevation: 1 })
		},
		filterTabText: { fontSize: 13, fontWeight: '600', letterSpacing: -0.1 },
		countBadge: {
			minWidth: 18,
			height: 18,
			borderRadius: 9,
			alignItems: 'center',
			justifyContent: 'center',
			paddingHorizontal: 4
		},
		countText: { fontSize: 10, fontWeight: '800' },
		listContainer: { paddingVertical: padding, paddingBottom: 40, flexGrow: 1, paddingHorizontal: padding },
		cardContainer: { width: '100%', paddingHorizontal: numColumns > 1 ? cardGap / 2 : 0, marginBottom: cardGap },
		purchaseCard: {
			borderRadius: 24,
			borderWidth: 1.5,
			padding: 20,
			minHeight: 380,
			justifyContent: 'space-between',
			...createShadow({ offsetY: 6, opacity: 0.08, radius: 12, elevation: 3 })
		},
		cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
		headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
		businessAvatar: { width: 44, height: 44, borderRadius: 14 },
		headerInfo: { flex: 1, minWidth: 0 },
		businessName: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
		orderDate: { fontSize: 12, fontWeight: '500', marginTop: 2 },
		statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
		statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
		divider: { height: 1, marginVertical: 16 },
		productList: { maxHeight: 180, flexGrow: 0 },
		productRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
		productThumb: { width: 48, height: 48, borderRadius: 10, borderWidth: 1, borderColor: '#FFFFFF10' },
		productInfoWrap: { flex: 1, minWidth: 0 },
		productNameText: { fontSize: 14, fontWeight: '700', letterSpacing: -0.1 },
		productQtyText: { fontSize: 12, fontWeight: '500', marginTop: 2 },
		productPriceText: { fontSize: 14, fontWeight: '800' },
		stepTracker: { marginVertical: 18, position: 'relative' },
		stepLine: { position: 'absolute', top: 9, left: 16, right: 16, height: 2, borderRadius: 1 },
		stepLineProgress: { position: 'absolute', top: 9, left: 16, height: 2, borderRadius: 1 },
		stepItemsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
		stepItem: { alignItems: 'center', width: 64 },
		stepDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
		stepLabel: { fontSize: 9, textAlign: 'center', marginTop: 8, letterSpacing: -0.1 },
		cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
		orderNumberLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
		orderNumberValue: { fontSize: 13, fontWeight: '600', marginTop: 2 },
		totalLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
		totalPrice: { fontSize: 20, fontWeight: '800', marginTop: 2 },
		actionsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
		actionBtn: {
			flex: 1,
			flexDirection: 'row',
			height: 42,
			borderRadius: 12,
			borderWidth: 1.5,
			justifyContent: 'center',
			alignItems: 'center',
			gap: 6
		},
		actionBtnText: { fontSize: 13, fontWeight: '700' },
		cartItemRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
		cartItemDetails: { flex: 1, minWidth: 0, justifyContent: 'space-between' },
		qtyRow: { flexDirection: 'row', alignItems: 'center', padding: 2, borderRadius: 8 },
		qtyBtn: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
		qtyVal: { fontSize: 12, fontWeight: '700', minWidth: 20, textAlign: 'center' },
		checkoutBtn: {
			flexDirection: 'row',
			height: 42,
			paddingHorizontal: 16,
			borderRadius: 12,
			alignItems: 'center',
			gap: 6,
			...Platform.select({ web: { boxShadow: '0 2px 8px rgba(56,189,248,0.25)' } as any })
		},
		checkoutBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
		emptyWrap: { flex: 1, paddingVertical: 80, paddingHorizontal: 32, alignItems: 'center', gap: 14 },
		emptyIconWrap: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
		emptyTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
		emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 }
	}) as any
}

export default PurchasesScreen
