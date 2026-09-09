import { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import { View, StyleSheet, useWindowDimensions } from 'react-native'
import { useFocusEffect, Stack, useNavigation, useLocalSearchParams, useRouter } from 'expo-router'
import { HeaderRefreshButton, SmartHeader } from '@smart-header'
import { useTheme, themeColors } from '@theme'
import { useBackButton } from '@hooks/useBackButton'
import { useUser } from '@contexts'
import ErrorBlock from '@error/ErrorBlock'
import Spinner from '@ui/spinner/Spinner'
import { ORDER_STATUSES, PURCHASE_TABS, orderStatusIcons } from '@orders/orders-statuses'
import { SmartTabs, SmartTabOption } from '@smart-tabs'
import { OrderList, BusinessCartGroup } from '@orders/components'
import { PurchaseCard } from './PurchaseCard'
import { CartCard } from './CartCard'
import { usePurchasesByStatus } from '@orders/usePurchasesByStatus'
import { updatePurchaseStatus } from '@orders/orders.api'
import { OrderItem } from '@orders/orders.interface'
import { useCart } from './hooks/useCart'
import { usePurchaseCounts } from './hooks/usePurchaseCounts'
import CheckoutConfirmationModal from './components/CheckoutConfirmationModal'
import { toast } from '@ui/toast/Toast'
import { showConfirm } from '@helpers/popup'

const statusOptions: SmartTabOption[] = [
	{ value: 'cart', label: 'Cart', iconName: orderStatusIcons.cart },
	{ value: PURCHASE_TABS.ACTIVE, label: 'Active', iconName: 'pulse-outline' },
	{ value: PURCHASE_TABS.ACTION_REQUIRED, label: 'Action Required', iconName: orderStatusIcons[ORDER_STATUSES.ACTION_REQUIRED] },
	{ value: PURCHASE_TABS.HISTORY, label: 'History', iconName: 'archive-outline' }
]

export default function PurchasesScreen() {
	const navigation = useNavigation()
	const router = useRouter()
	const { colors } = useTheme()
	const { translate, user, refreshUser } = useUser()
	const { width } = useWindowDimensions()
	const { tab } = useLocalSearchParams<{ tab?: string }>()

	const selectedTab = useMemo(() => {
		const raw = Array.isArray(tab) ? tab[0] : tab
		return raw || 'cart'
	}, [tab])

	const setSelectedTab = useCallback(
		(value: string) => {
			router.setParams({ tab: value })
		},
		[router]
	)
	useBackButton()

	const isPurchaseTab = selectedTab !== 'cart'
	const [confirmGroup, setConfirmGroup] = useState<BusinessCartGroup | null>(null)
	const isTablet = width >= 768
	const isDesktop = width >= 1024
	const numColumns = isDesktop ? 3 : isTablet ? 2 : 1

	const { counts: tabCounts, refresh: refreshCounts, setTabCount, isLoading: countsLoading } = usePurchaseCounts()
	const { cart, cartGroups, loadCart, updateQuantity, removeItem, checkout, isCheckingOut, refreshCart, isRefreshing: isCartRefreshing } = useCart()

	const {
		data: purchasesResponse,
		isInitialLoading,
		isRefreshing: isPurchasesRefreshing,
		isOffline,
		refresh
	} = usePurchasesByStatus({
		tab: selectedTab,
		skipInitialFetch: !isPurchaseTab || !user
	})

	const isRefreshing = isPurchasesRefreshing || isCartRefreshing

	const refreshAfterStatusChange = useCallback(async () => {
		if (!user) return
		const tabData = await refresh()
		if (tabData) {
			setTabCount(selectedTab, tabData)
		}
	}, [refresh, setTabCount, user, selectedTab])

	useEffect(() => {
		if (!user || !purchasesResponse) return
		if (selectedTab !== 'cart') {
			setTabCount(selectedTab, purchasesResponse)
		}
	}, [user, selectedTab, purchasesResponse, setTabCount])

	const purchaseItems = useMemo(() => {
		if (!purchasesResponse?.data?.docs) return []
		return [...purchasesResponse.data.docs].sort((a: OrderItem, b: OrderItem) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
	}, [purchasesResponse])

	const displayData = useMemo(() => {
		return selectedTab === 'cart' ? cartGroups : purchaseItems
	}, [selectedTab, cartGroups, purchaseItems])

	// usePurchaseCounts' `cart` figure is read from AsyncStorage independently
	// of useCart's in-memory `cart` state, so it goes stale after any local
	// cart mutation (add/update/remove/checkout) until the next refresh.
	// The in-memory `cart` array is always immediately accurate, so it's used
	// to override the displayed cart count everywhere.
	const displayCounts = useMemo<Record<string, number>>(() => ({ ...tabCounts, cart: cart.length }), [tabCounts, cart.length])

	const itemCount = displayCounts[selectedTab] ?? 0

	const activeCount = useMemo(() => {
		if (selectedTab === 'cart') return cart.length
		return purchasesResponse?.data?.pagination?.totalDocs
	}, [selectedTab, cart.length, purchasesResponse])

	const handleRefresh = useCallback(async () => {
		if (selectedTab === 'cart') {
			await refreshCart()
			await loadCart()
		} else {
			await loadCart()
			if (user) {
				const tabData = await refresh()
				if (tabData) {
					setTabCount(selectedTab, tabData)
				}
			}
		}
		await refreshCounts()
	}, [selectedTab, refreshCart, loadCart, user, refreshCounts, setTabCount, refresh])

	// Keep the latest values in a ref so the focus-effect callback below can
	// stay referentially stable. useFocusEffect re-invokes its callback
	// whenever its identity changes, even while the screen stays focused —
	// so if it depended on isPurchaseTab/refresh directly, switching tabs
	// (e.g. after checkout) would spuriously re-trigger it and cause
	// duplicate API calls.
	const focusStateRef = useRef({ user, selectedTab, setTabCount, loadCart, refresh })
	useEffect(() => {
		focusStateRef.current = { user, selectedTab, setTabCount, loadCart, refresh }
	}, [user, selectedTab, setTabCount, loadCart, refresh])

	useFocusEffect(
		useCallback(() => {
			const { user, selectedTab, setTabCount, loadCart, refresh } = focusStateRef.current
			if (selectedTab === 'cart') {
				loadCart()
			} else {
				loadCart()
				if (user) {
					refresh().then((tabData) => {
						if (tabData) {
							setTabCount(selectedTab, tabData)
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
					toast.show({ title: translate('success', 'Success'), content: translate('checkout_success', 'Order placed successfully!'), borderColor: themeColors.success })
					setSelectedTab(PURCHASE_TABS.ACTIVE)
				}
			} catch (err) {
				console.error('Checkout failed:', err)
				toast.show({ title: translate('error', 'Error'), content: translate('checkout_failed', 'Failed to place order'), borderColor: themeColors.error })
			}
		},
		[checkout, setSelectedTab, translate]
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
					await updatePurchaseStatus({ purchaseId, status: ORDER_STATUSES.CANCELLED })
					await refreshAfterStatusChange()
					toast.show({ title: translate('success', 'Success'), content: translate('cancel_order_success', 'Order cancelled successfully'), borderColor: themeColors.success })
				} catch (err) {
					console.error('Failed to cancel order:', err)
					toast.show({ title: translate('error', 'Error'), content: translate('cancel_order_failed', 'Failed to cancel order. Please try again.'), borderColor: themeColors.error })
				}
			})
		},
		[refreshAfterStatusChange, translate]
	)

	const handleApproveChanges = useCallback(
		async (purchaseId: string) => {
			try {
				await updatePurchaseStatus({ purchaseId, status: ORDER_STATUSES.ACCEPTED })
				await refreshAfterStatusChange()
				toast.show({ title: translate('success', 'Success'), content: translate('status_updated', 'Order status updated successfully'), borderColor: themeColors.success })
			} catch (err) {
				console.error('Failed to approve order changes:', err)
				toast.show({ title: translate('error', 'Error'), content: translate('status_update_failed', 'Failed to update order status. Please try again.'), borderColor: themeColors.error })
			}
		},
		[refreshAfterStatusChange, translate]
	)

	const handleMarkReceived = useCallback(
		async (purchaseId: string) => {
			try {
				await updatePurchaseStatus({ purchaseId, status: ORDER_STATUSES.DELIVERED })
				await refreshAfterStatusChange()
				toast.show({ title: translate('success', 'Success'), content: translate('status_updated', 'Order status updated successfully'), borderColor: themeColors.success })
			} catch (err) {
				console.error('Failed to update order status:', err)
				toast.show({ title: translate('error', 'Error'), content: translate('status_update_failed', 'Failed to update order status. Please try again.'), borderColor: themeColors.error })
			}
		},
		[refreshAfterStatusChange, translate]
	)

	const renderCartGroup = useCallback(
		({ item }: { item: BusinessCartGroup }) => (
			<View style={[numColumns > 1 ? styles.columnItem : styles.fullWidthItem, numColumns > 1 && { paddingHorizontal: 8, marginBottom: 16 }]}>
				<CartCard group={item} onUpdateQuantity={updateQuantity} onRemove={removeItem} onCheckout={handleCheckout} />
			</View>
		),
		[numColumns, updateQuantity, removeItem, handleCheckout]
	)

	const renderPurchaseItem = useCallback(
		({ item }: { item: OrderItem }) => (
			<View style={[numColumns > 1 ? styles.columnItem : styles.fullWidthItem, numColumns > 1 && { paddingHorizontal: 8, marginBottom: 16 }]}>
				<PurchaseCard item={item} onCancel={handleCancelOrder} onApprove={handleApproveChanges} onMarkReceived={handleMarkReceived} />
			</View>
		),
		[numColumns, handleCancelOrder, handleApproveChanges, handleMarkReceived]
	)

	const renderItem = useCallback(
		({ item }: { item: any }) => {
			if (selectedTab === 'cart') {
				return renderCartGroup({ item })
			}
			return renderPurchaseItem({ item })
		},
		[selectedTab, renderCartGroup, renderPurchaseItem]
	)

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen options={{ headerShown: false }} />

			<SmartHeader
				navigation={navigation}
				title={translate('purchases_title', 'Purchases')}
				subtitle={itemCount > 0 ? String(itemCount) : undefined}
				back={navigation.canGoBack() ? { title: 'Back' } : undefined}
				headerBottomHeight={52}
				options={{ onRefresh: handleRefresh, isRefreshing: isRefreshing || countsLoading || isCheckingOut }}
				headerActions={[<HeaderRefreshButton key="refresh" onRefresh={handleRefresh} isRefreshing={isRefreshing || countsLoading || isCheckingOut} />]}
				headerBottom={
					<SmartTabs
						value={selectedTab}
						onChange={setSelectedTab}
						options={statusOptions}
						counts={displayCounts}
						activeCount={activeCount}
						resetKey={user?._id ?? ''}
						loading={isRefreshing || countsLoading || isCheckingOut}
					/>
				}
			/>

			{isOffline && displayData.length === 0 ? (
				<ErrorBlock />
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
