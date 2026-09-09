/**
 * features/purchases/PurchaseScreen — single purchase details (/purchases/{purchase._id}).
 *
 * Purpose: fetch one purchase by id and render it with PurchaseCard,
 * including cancel / mark-received actions. Mirrors SaleScreen structure
 * (focus refetch, pull-to-refresh, spinner + error states).
 */
import { useCallback, useState } from 'react'
import { View, StyleSheet, RefreshControl } from 'react-native'
import { useLocalSearchParams, Stack, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, themeColors } from '@theme'
import { useUser } from '@contexts/UserContext'
import { HeaderRefreshButton, SmartHeader } from '@smart-header'
import { getPurchaseById, updatePurchaseStatus } from '@orders/orders.api'
import { ORDER_STATUSES } from '@orders/orders-statuses'
import { OrderItem } from '@orders/orders.interface'
import { PurchaseCard } from './PurchaseCard'
import Spinner from '@ui/spinner/Spinner'
import ErrorBlock from '@error/ErrorBlock'
import { toast } from '@ui/toast/Toast'
import { showConfirm } from '@helpers/popup'

export default function PurchaseScreen() {
	const { purchaseId } = useLocalSearchParams<{ purchaseId: string }>()
	const { colors } = useTheme()
	const { translate } = useUser()
	const insets = useSafeAreaInsets()

	const [purchase, setPurchase] = useState<OrderItem | null>(null)
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState(false)

	const fetchPurchase = useCallback(
		async (showSpinner = true) => {
			if (!purchaseId) return
			if (showSpinner) setLoading(true)
			setError(false)
			try {
				const response = await getPurchaseById(purchaseId)
				setPurchase(response.data?.data ?? response.data)
			} catch (err) {
				console.error('Failed to load purchase details', err)
				setError(true)
			} finally {
				setLoading(false)
				setRefreshing(false)
			}
		},
		[purchaseId]
	)

	useFocusEffect(
		useCallback(() => {
			fetchPurchase(true)
		}, [fetchPurchase])
	)

	const onRefresh = useCallback(() => {
		setRefreshing(true)
		fetchPurchase(false)
	}, [fetchPurchase])

	const handleCancelOrder = useCallback(() => {
		if (!purchase) return
		showConfirm(translate('cancel_order', 'Cancel Order'), translate('cancel_order_confirm', 'Are you sure you want to cancel this order?'), async () => {
			try {
				await updatePurchaseStatus({ purchaseId: purchase._id, status: ORDER_STATUSES.CANCELLED })
				await fetchPurchase(false)
				toast.show({ title: translate('success', 'Success'), content: translate('cancel_order_success', 'Order cancelled successfully'), borderColor: themeColors.success })
			} catch (err) {
				console.error('Failed to cancel order:', err)
				toast.show({ title: translate('error', 'Error'), content: translate('cancel_order_failed', 'Failed to cancel order. Please try again.'), borderColor: themeColors.error })
			}
		})
	}, [purchase, fetchPurchase, translate])

	const handleApproveChanges = useCallback(async () => {
		if (!purchase) return
		try {
			await updatePurchaseStatus({ purchaseId: purchase._id, status: ORDER_STATUSES.ACCEPTED })
			await fetchPurchase(false)
			toast.show({ title: translate('success', 'Success'), content: translate('status_updated', 'Order status updated successfully'), borderColor: themeColors.success })
		} catch (err) {
			console.error('Failed to approve order changes:', err)
			toast.show({ title: translate('error', 'Error'), content: translate('status_update_failed', 'Failed to update order status. Please try again.'), borderColor: themeColors.error })
		}
	}, [purchase, fetchPurchase, translate])

	const handleMarkReceived = useCallback(async () => {
		if (!purchase) return
		try {
			await updatePurchaseStatus({ purchaseId: purchase._id, status: ORDER_STATUSES.DELIVERED })
			await fetchPurchase(false)
			toast.show({ title: translate('success', 'Success'), content: translate('status_updated', 'Order status updated successfully'), borderColor: themeColors.success })
		} catch (err) {
			console.error('Failed to update order status:', err)
			toast.show({ title: translate('error', 'Error'), content: translate('status_update_failed', 'Failed to update order status. Please try again.'), borderColor: themeColors.error })
		}
	}, [purchase, fetchPurchase, translate])

	if (loading) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}>
				<Stack.Screen options={{ title: translate('purchase_details', 'Purchase Details') }} />
				<Spinner />
			</View>
		)
	}

	if (error || !purchase) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}>
				<Stack.Screen options={{ title: translate('error', 'Error') }} />
				<SmartHeader title={translate('error', 'Error')} fallbackRoute="/purchases" />
				<ErrorBlock onRetry={() => fetchPurchase(true)} />
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen
				options={
					{
						title: translate('purchase_details', 'Purchase Details'),
						subtitle: purchase._id,
						headerActions: [<HeaderRefreshButton key="refresh" onRefresh={onRefresh} isRefreshing={refreshing} />]
					} as any
				}
			/>
			<SmartHeader.ScrollView
				style={styles.container}
				contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
			>
				<PurchaseCard item={purchase} onCancel={handleCancelOrder} onApprove={handleApproveChanges} onMarkReceived={handleMarkReceived} />
			</SmartHeader.ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	scrollContent: {
		padding: 16,
		paddingTop: 16
	}
})
