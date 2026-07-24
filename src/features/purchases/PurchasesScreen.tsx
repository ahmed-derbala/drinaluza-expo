import { useMemo, useCallback } from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { useWindowDimensions } from 'react-native'
import { useFocusEffect, Stack, useNavigation, useLocalSearchParams, useRouter } from 'expo-router'

import { SmartHeader } from '@/core/smart-header'
import { useTheme } from '@/core/theme'
import { useBackButton } from '@/core/hooks/useBackButton'

import { useUser } from '@/core/contexts'
import ErrorState from '@/features/common/ErrorState'
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
import { toast } from '@/features/common/Toast'
import { showConfirm } from '@/core/helpers/popup'

const statusOptions: OrderStatusTabOption[] = [
	{ value: 'cart', label: 'Cart', iconName: orderStatusIcons.cart },
	{ value: 'all', label: 'All Orders', iconName: orderStatusIcons.all },
	{
		value: ORDER_STATUSES.PENDING_BUSINESS_CONFIRMATION,
		label: orderStatusLabels[ORDER_STATUSES.PENDING_BUSINESS_CONFIRMATION],
		iconName: orderStatusIcons[ORDER_STATUSES.PENDING_BUSINESS_CONFIRMATION]
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
	const { translate, user } = useUser()
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
	const isTablet = width >= 768
	const isDesktop = width >= 1024
	const numColumns = isDesktop ? 3 : isTablet ? 2 : 1

	const { counts: statusCounts, refresh: refreshCounts, isLoading: countsLoading } = usePurchaseCounts()
	const { cart, cartGroups, loadCart, updateQuantity, removeItem, checkout, isCheckingOut } = useCart()

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

	const displayData = useMemo(() => {
		return selectedStatus === 'cart' ? cartGroups : purchaseItems
	}, [selectedStatus, cartGroups, purchaseItems])

	const itemCount = statusCounts[selectedStatus] ?? 0

	const handleRefresh = useCallback(async () => {
		await refreshCounts(user)
		await loadCart()
		if (user && isPurchaseStatus) {
			await refresh()
		}
	}, [user, isPurchaseStatus, refreshCounts, loadCart, refresh])

	useFocusEffect(
		useCallback(() => {
			refreshCounts(user)
			loadCart()
			if (user && isPurchaseStatus) {
				refresh()
			}
		}, [user, isPurchaseStatus, refreshCounts, loadCart, refresh])
	)

	const handleCheckout = useCallback(
		async (group: BusinessCartGroup) => {
			try {
				const result = await checkout(group)
				if (result.success) {
					toast.show({ title: translate('success', 'Success'), message: translate('checkout_success', 'Order placed successfully!'), color: '#10B981' })
					setSelectedStatus(ORDER_STATUSES.PENDING_BUSINESS_CONFIRMATION)
					await refreshCounts(user)
					if (user) await refresh()
				}
			} catch (err) {
				console.error('Checkout failed:', err)
				toast.show({ title: translate('error', 'Error'), message: translate('checkout_failed', 'Failed to place order'), color: '#EF4444' })
			}
		},
		[checkout, refreshCounts, refresh, setSelectedStatus, translate, user]
	)

	const handleCancelOrder = useCallback(
		(purchaseId: string) => {
			showConfirm(translate('cancel_order', 'Cancel Order'), translate('cancel_order_confirm', 'Are you sure you want to cancel this order?'), async () => {
				try {
					await updatePurchaseStatus({ purchaseId, status: 'cancelled_by_customer' })
					await refreshCounts(user)
					await refresh()
					toast.show({ title: translate('success', 'Success'), message: translate('cancel_order_success', 'Order cancelled successfully'), color: '#10B981' })
				} catch (err) {
					console.error('Failed to cancel order:', err)
					toast.show({ title: translate('error', 'Error'), message: translate('cancel_order_failed', 'Failed to cancel order. Please try again.'), color: '#EF4444' })
				}
			})
		},
		[refreshCounts, refresh, translate, user]
	)

	const handleMarkReceived = useCallback(
		async (purchaseId: string) => {
			try {
				await updatePurchaseStatus({ purchaseId, status: 'received_by_customer' })
				await refreshCounts(user)
				await refresh()
				toast.show({ title: translate('success', 'Success'), message: translate('status_updated', 'Order status updated successfully'), color: '#10B981' })
			} catch (err) {
				console.error('Failed to update order status:', err)
				toast.show({ title: translate('error', 'Error'), message: translate('status_update_failed', 'Failed to update order status. Please try again.'), color: '#EF4444' })
			}
		},
		[refreshCounts, refresh, translate, user]
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
				headerBottom={<OrderStatusTabs value={selectedStatus} onChange={setSelectedStatus} options={statusOptions} counts={statusCounts} loading={isRefreshing || countsLoading || isCheckingOut} />}
			/>

			{isOffline && displayData.length === 0 ? (
				<ErrorState icon="cloud-offline-outline" iconOnly />
			) : isInitialLoading ? (
				<View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
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
