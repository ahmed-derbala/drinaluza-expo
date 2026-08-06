import { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { useWindowDimensions } from 'react-native'
import { useFocusEffect, Stack, useNavigation, useLocalSearchParams, useRouter } from 'expo-router'

import { SmartHeader } from '@/core/smart-header'
import { useTheme, colors as themeColors } from '@/core/theme'
import { useBackButton } from '@/core/hooks/useBackButton'

import { useUser } from '@/core/contexts'
import ErrorState from '@/features/common/ErrorState'
import Spinner from '@/features/common/Spinner'
import { ORDER_STATUSES, orderStatusLabels, orderStatusIcons } from '@/features/orders/orders-statuses'
import { OrderStatusTabs, OrderStatusTabOption } from '@/features/orders/components/OrderStatusTabs'
import { OrderList } from '@/features/orders/components/OrderList'
import { PurchaseCard } from '@/features/orders/components/PurchaseCard'
import { CartGroupCard, BusinessCartGroup } from '@/features/orders/components/CartGroupCard'
import { usePurchasesByStatus } from '@/features/orders/usePurchasesByStatus'
import { updatePurchaseStatus } from '@/features/orders/orders.api'
import { OrderItem } from '@/features/orders/orders.interface'
import { useCart } from './hooks/useCart'
import { usePurchaseCounts } from './hooks/usePurchaseCounts'
import CheckoutConfirmationModal from './components/CheckoutConfirmationModal'
import { toast } from '@/features/common/Toast'
import { showConfirm } from '@/core/helpers/popup'

const statusOptions: OrderStatusTabOption[] = [
	{ value: 'cart', label: 'Cart', iconName: orderStatusIcons.cart },
	{ value: 'all', label: 'All', iconName: orderStatusIcons.all },
	{
		value: ORDER_STATUSES.PENDING_BUSINESS_CONFIRMATION,
		label: 'Pending',
		iconName: orderStatusIcons[ORDER_STATUSES.PENDING_BUSINESS_CONFIRMATION]
	},
	{
		value: ORDER_STATUSES.PENDING_CUSTOMER_CONFIRMATION,
		label: orderStatusLabels[ORDER_STATUSES.PENDING_CUSTOMER_CONFIRMATION],
		iconName: orderStatusIcons[ORDER_STATUSES.PENDING_CUSTOMER_CONFIRMATION]
	},
	{ value: ORDER_STATUSES.CONFIRMED_BY_BUSINESS, label: orderStatusLabels[ORDER_STATUSES.CONFIRMED_BY_BUSINESS], iconName: orderStatusIcons[ORDER_STATUSES.CONFIRMED_BY_BUSINESS] },
	{
		value: ORDER_STATUSES.RESERVED_BY_BUSINESS_FOR_PICKUP_BY_CUSTOMER,
		label: orderStatusLabels[ORDER_STATUSES.RESERVED_BY_BUSINESS_FOR_PICKUP_BY_CUSTOMER],
		iconName: orderStatusIcons[ORDER_STATUSES.RESERVED_BY_BUSINESS_FOR_PICKUP_BY_CUSTOMER]
	},
	{ value: ORDER_STATUSES.DELIVERING_TO_CUSTOMER, label: orderStatusLabels[ORDER_STATUSES.DELIVERING_TO_CUSTOMER], iconName: orderStatusIcons[ORDER_STATUSES.DELIVERING_TO_CUSTOMER] },
	{ value: ORDER_STATUSES.DELIVERED_TO_CUSTOMER, label: orderStatusLabels[ORDER_STATUSES.DELIVERED_TO_CUSTOMER], iconName: orderStatusIcons[ORDER_STATUSES.DELIVERED_TO_CUSTOMER] },
	{ value: ORDER_STATUSES.RECEIVED_BY_CUSTOMER, label: orderStatusLabels[ORDER_STATUSES.RECEIVED_BY_CUSTOMER], iconName: orderStatusIcons[ORDER_STATUSES.RECEIVED_BY_CUSTOMER] },
	{ value: ORDER_STATUSES.RESERVATION_EXPIRED, label: orderStatusLabels[ORDER_STATUSES.RESERVATION_EXPIRED], iconName: orderStatusIcons[ORDER_STATUSES.RESERVATION_EXPIRED] },
	{ value: ORDER_STATUSES.CANCELLED_BY_CUSTOMER, label: orderStatusLabels[ORDER_STATUSES.CANCELLED_BY_CUSTOMER], iconName: orderStatusIcons[ORDER_STATUSES.CANCELLED_BY_CUSTOMER] },
	{ value: ORDER_STATUSES.CANCELLED_BY_BUSINESS, label: orderStatusLabels[ORDER_STATUSES.CANCELLED_BY_BUSINESS], iconName: orderStatusIcons[ORDER_STATUSES.CANCELLED_BY_BUSINESS] }
]

export default function PurchasesScreen() {
	const navigation = useNavigation()
	const router = useRouter()
	const { colors } = useTheme()
	const { translate, user, refreshUser } = useUser()
	const { width } = useWindowDimensions()
	const { status } = useLocalSearchParams<{ status?: string }>()

	const selectedStatus = useMemo(() => {
		const raw = Array.isArray(status) ? status[0] : status
		return raw || 'cart'
	}, [status])

	const setSelectedStatus = useCallback(
		(value: string) => {
			router.setParams({ status: value })
		},
		[router]
	)
	useBackButton()

	const isPurchaseStatus = selectedStatus !== 'cart'
	const [confirmGroup, setConfirmGroup] = useState<BusinessCartGroup | null>(null)
	const isTablet = width >= 768
	const isDesktop = width >= 1024
	const numColumns = isDesktop ? 3 : isTablet ? 2 : 1

	const { counts: statusCounts, refresh: refreshCounts, setStatusCount, isLoading: countsLoading } = usePurchaseCounts()
	const { cart, cartGroups, loadCart, updateQuantity, removeItem, checkout, isCheckingOut, refreshCart, isRefreshing: isCartRefreshing } = useCart()

	const {
		data: purchasesResponse,
		isInitialLoading,
		isRefreshing: isPurchasesRefreshing,
		isOffline,
		refresh
	} = usePurchasesByStatus({
		status: selectedStatus,
		skipInitialFetch: !isPurchaseStatus || !user
	})

	const isRefreshing = isPurchasesRefreshing || isCartRefreshing

	useEffect(() => {
		if (!user || !purchasesResponse) return
		if (selectedStatus === 'all') {
			refreshCounts(user, purchasesResponse)
		} else if (selectedStatus !== 'cart') {
			setStatusCount(selectedStatus, purchasesResponse)
		}
	}, [user, selectedStatus, purchasesResponse, refreshCounts, setStatusCount])

	const purchaseItems = useMemo(() => {
		if (!purchasesResponse?.data?.docs) return []
		return [...purchasesResponse.data.docs].sort((a: OrderItem, b: OrderItem) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
	}, [purchasesResponse])

	const displayData = useMemo(() => {
		return selectedStatus === 'cart' ? cartGroups : purchaseItems
	}, [selectedStatus, cartGroups, purchaseItems])

	// usePurchaseCounts' `cart` figure is read from AsyncStorage independently
	// of useCart's in-memory `cart` state, so it goes stale after any local
	// cart mutation (add/update/remove/checkout) until the next refresh.
	// The in-memory `cart` array is always immediately accurate, so it's used
	// to override the displayed cart count everywhere.
	const displayCounts = useMemo<Record<string, number>>(() => ({ ...statusCounts, cart: cart.length }), [statusCounts, cart.length])

	const itemCount = displayCounts[selectedStatus] ?? 0

	const activeCount = useMemo(() => {
		if (selectedStatus === 'cart') return cart.length
		return purchasesResponse?.data?.pagination?.totalDocs
	}, [selectedStatus, cart.length, purchasesResponse])

	const handleRefresh = useCallback(async () => {
		if (selectedStatus === 'cart') {
			await refreshCart()
			await loadCart()
		} else if (selectedStatus === 'all') {
			await loadCart()
			if (user) {
				const allData = await refresh()
				await refreshCounts(user, allData)
			} else {
				await refreshCounts(user)
			}
		} else {
			await loadCart()
			if (user) {
				const statusData = await refresh()
				if (statusData) {
					setStatusCount(selectedStatus, statusData)
				}
			}
		}
	}, [selectedStatus, refreshCart, loadCart, user, refreshCounts, setStatusCount, refresh])

	// Keep the latest values in a ref so the focus-effect callback below can
	// stay referentially stable. useFocusEffect re-invokes its callback
	// whenever its identity changes, even while the screen stays focused —
	// so if it depended on isPurchaseStatus/refresh directly, switching tabs
	// (e.g. after checkout) would spuriously re-trigger it and cause
	// duplicate API calls.
	const focusStateRef = useRef({ user, selectedStatus, refreshCounts, setStatusCount, loadCart, refresh })
	useEffect(() => {
		focusStateRef.current = { user, selectedStatus, refreshCounts, setStatusCount, loadCart, refresh }
	}, [user, selectedStatus, refreshCounts, setStatusCount, loadCart, refresh])

	useFocusEffect(
		useCallback(() => {
			const { user, selectedStatus, refreshCounts, setStatusCount, loadCart, refresh } = focusStateRef.current
			if (selectedStatus === 'cart') {
				loadCart()
			} else if (selectedStatus === 'all') {
				loadCart()
				if (user) {
					refresh().then((allData) => refreshCounts(user, allData))
				} else {
					refreshCounts(user)
				}
			} else {
				loadCart()
				if (user) {
					refresh().then((statusData) => {
						if (statusData) {
							setStatusCount(selectedStatus, statusData)
						}
					})
				}
			}
		}, [])
	)

	const executeCheckout = useCallback(
		async (group: BusinessCartGroup) => {
			try {
				const result = await checkout(group)
				if (result.success) {
					toast.show({ title: translate('success', 'Success'), message: translate('checkout_success', 'Order placed successfully!'), color: themeColors.success })
					setSelectedStatus(ORDER_STATUSES.PENDING_BUSINESS_CONFIRMATION)
				}
			} catch (err) {
				console.error('Checkout failed:', err)
				toast.show({ title: translate('error', 'Error'), message: translate('checkout_failed', 'Failed to place order'), color: themeColors.error })
			}
		},
		[checkout, setSelectedStatus, translate]
	)

	const handleCheckout = useCallback(
		(group: BusinessCartGroup) => {
			const confirmationEnabled = user?.settings?.purchases?.confirmation?.isEnabled !== false
			if (confirmationEnabled) {
				setConfirmGroup(group)
			} else {
				executeCheckout(group)
			}
		},
		[user, executeCheckout]
	)

	const handleConfirmComplete = useCallback(async () => {
		const group = confirmGroup
		setConfirmGroup(null)
		if (group) {
			await executeCheckout(group)
		}
	}, [confirmGroup, executeCheckout])

	const handleCancelOrder = useCallback(
		(purchaseId: string) => {
			showConfirm(translate('cancel_order', 'Cancel Order'), translate('cancel_order_confirm', 'Are you sure you want to cancel this order?'), async () => {
				try {
					await updatePurchaseStatus({ purchaseId, status: 'cancelled_by_customer' })
					if (selectedStatus === 'all') {
						const allData = await refresh()
						await refreshCounts(user, allData)
					} else if (user) {
						const statusData = await refresh()
						if (statusData) {
							setStatusCount(selectedStatus, statusData)
						}
					}
					toast.show({ title: translate('success', 'Success'), message: translate('cancel_order_success', 'Order cancelled successfully'), color: themeColors.success })
				} catch (err) {
					console.error('Failed to cancel order:', err)
					toast.show({ title: translate('error', 'Error'), message: translate('cancel_order_failed', 'Failed to cancel order. Please try again.'), color: themeColors.error })
				}
			})
		},
		[refreshCounts, refresh, setStatusCount, translate, user, selectedStatus]
	)

	const handleMarkReceived = useCallback(
		async (purchaseId: string) => {
			try {
				await updatePurchaseStatus({ purchaseId, status: 'received_by_customer' })
				if (selectedStatus === 'all') {
					const allData = await refresh()
					await refreshCounts(user, allData)
				} else if (user) {
					const statusData = await refresh()
					if (statusData) {
						setStatusCount(selectedStatus, statusData)
					}
				}
				toast.show({ title: translate('success', 'Success'), message: translate('status_updated', 'Order status updated successfully'), color: themeColors.success })
			} catch (err) {
				console.error('Failed to update order status:', err)
				toast.show({ title: translate('error', 'Error'), message: translate('status_update_failed', 'Failed to update order status. Please try again.'), color: themeColors.error })
			}
		},
		[refreshCounts, refresh, setStatusCount, translate, user, selectedStatus]
	)

	const renderCartGroup = useCallback(
		({ item }: { item: BusinessCartGroup }) => (
			<View style={[numColumns > 1 ? styles.columnItem : styles.fullWidthItem, numColumns > 1 && { paddingHorizontal: 8, marginBottom: 16 }]}>
				<CartGroupCard group={item} onUpdateQuantity={updateQuantity} onRemove={removeItem} onCheckout={handleCheckout} />
			</View>
		),
		[numColumns, updateQuantity, removeItem, handleCheckout]
	)

	const renderPurchaseItem = useCallback(
		({ item }: { item: OrderItem }) => (
			<View style={[numColumns > 1 ? styles.columnItem : styles.fullWidthItem, numColumns > 1 && { paddingHorizontal: 8, marginBottom: 16 }]}>
				<PurchaseCard item={item} onCancel={handleCancelOrder} onMarkReceived={handleMarkReceived} />
			</View>
		),
		[numColumns, handleCancelOrder, handleMarkReceived]
	)

	const renderItem = useCallback(
		({ item }: { item: any }) => {
			if (selectedStatus === 'cart') {
				return renderCartGroup({ item })
			}
			return renderPurchaseItem({ item })
		},
		[selectedStatus, renderCartGroup, renderPurchaseItem]
	)

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen options={{ headerShown: false }} />

			<SmartHeader
				navigation={navigation}
				title={translate('purchases_title', 'Purchases')}
				subtitle={itemCount > 0 ? `${itemCount} ${itemCount === 1 ? translate('item', 'item') : translate('items', 'items')}` : undefined}
				back={navigation.canGoBack() ? { title: 'Back' } : undefined}
				headerBottomHeight={52}
				options={{ onRefresh: handleRefresh, isRefreshing: isRefreshing || countsLoading || isCheckingOut }}
				headerActions={['refresh']}
				headerBottom={
					<OrderStatusTabs
						value={selectedStatus}
						onChange={setSelectedStatus}
						options={statusOptions}
						counts={displayCounts}
						activeCount={activeCount}
						resetKey={user?._id ?? ''}
						loading={isRefreshing || countsLoading || isCheckingOut}
					/>
				}
			/>

			{isOffline && displayData.length === 0 ? (
				<ErrorState icon="cloud-offline-outline" iconOnly />
			) : isInitialLoading ? (
				<Spinner />
			) : (
				<OrderList
					data={displayData}
					renderItem={renderItem}
					keyExtractor={(item: any) => item._id || item.businessId}
					numColumns={numColumns}
					isRefreshing={isRefreshing}
					onRefresh={handleRefresh}
					emptyIcon="receipt-long"
					contentContainerStyle={[styles.listContent, numColumns > 1 && { paddingHorizontal: 8 }]}
				/>
			)}

			<CheckoutConfirmationModal visible={!!confirmGroup} group={confirmGroup} user={user} onClose={() => setConfirmGroup(null)} onComplete={handleConfirmComplete} refreshUser={refreshUser} />
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	loadingOverlay: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
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
	}
})
