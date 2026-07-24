import { useMemo, useCallback } from 'react'
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useWindowDimensions } from 'react-native'
import { useFocusEffect, useLocalSearchParams, Stack, useRouter, useNavigation } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { SmartHeader } from '@/core/smart-header'
import { useTheme } from '@/core/theme'
import { useBackButton } from '@/core/hooks/useBackButton'

import ErrorState from '@/features/common/ErrorState'
import { ORDER_STATUSES, orderStatusLabels, orderStatusIcons } from '@/features/orders/orders-statuses'
import { OrderStatusTabs, OrderStatusTabOption } from '@/features/orders/components/OrderStatusTabs'
import { OrderList } from '@/features/orders/components/OrderList'
import SaleCard from './SaleCard'
import { Sale } from './sales.api'
import { usePaginatedSales } from './hooks/usePaginatedSales'
import { useSalesCounts } from './hooks/useSalesCounts'

const statusOptions: OrderStatusTabOption[] = [
	{ value: 'all', label: 'All Sales', iconName: orderStatusIcons.all },
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

export default function SalesScreen() {
	const { businessSlug, customerSlug, productSlug, status } = useLocalSearchParams<{
		businessSlug: string
		customerSlug?: string
		productSlug?: string
		status?: string
	}>()
	const router = useRouter()
	const navigation = useNavigation()
	const { colors } = useTheme()
	const { width } = useWindowDimensions()
	const selectedStatus = useMemo(() => {
		const raw = Array.isArray(status) ? status[0] : status
		return raw || 'all'
	}, [status])

	const setSelectedStatus = useCallback(
		(value: string) => {
			router.setParams({ status: value })
		},
		[router]
	)
	useBackButton()

	const numColumns = width >= 1024 ? 2 : 1

	const { counts: statusCounts, refresh: refreshCounts, isLoading: countsLoading } = useSalesCounts()

	const { sales, isInitialLoading, isRefreshing, isOffline, refresh, loadMore, loadingMore } = usePaginatedSales({
		businessSlug,
		customerSlug,
		productSlug,
		status: selectedStatus
	})

	const itemCount = statusCounts[selectedStatus] ?? 0

	const handleRefresh = useCallback(async () => {
		await refreshCounts(businessSlug, customerSlug, productSlug)
		await refresh()
	}, [businessSlug, customerSlug, productSlug, refresh, refreshCounts])

	useFocusEffect(
		useCallback(() => {
			refreshCounts(businessSlug, customerSlug, productSlug)
			refresh()
		}, [businessSlug, customerSlug, productSlug, refresh, refreshCounts])
	)

	const renderItem = useCallback(
		({ item }: { item: Sale }) => (
			<View style={[numColumns > 1 ? styles.columnItem : styles.fullWidthItem, numColumns > 1 && { paddingHorizontal: 8, marginBottom: 16 }]}>
				<SaleCard sale={item} onStatusUpdate={handleRefresh} />
			</View>
		),
		[numColumns, handleRefresh]
	)

	const activeFiltersBanner = useMemo(() => {
		if (!customerSlug && !productSlug) return null
		return (
			<View style={[styles.activeFiltersBanner, { backgroundColor: colors.primaryContainer, borderColor: colors.primary }]}>
				<View style={styles.activeFiltersLeft}>
					<Ionicons name="funnel-outline" size={18} color={colors.primary} />
					<View style={{ flex: 1 }}>
						<Text style={[styles.activeFiltersTitle, { color: colors.text }]}>Filtered Sales</Text>
						<Text style={[styles.activeFiltersSubtitle, { color: colors.textSecondary }]}>
							Showing sales for {customerSlug ? `Customer: @${customerSlug}` : ''}
							{customerSlug && productSlug ? ' • ' : ''}
							{productSlug ? `Product: @${productSlug}` : ''}
						</Text>
					</View>
				</View>
				<TouchableOpacity onPress={() => router.setParams({ customerSlug: '', productSlug: '' })} style={[styles.clearFilterBtn, { backgroundColor: colors.surface }]} activeOpacity={0.7}>
					<Ionicons name="close" size={16} color={colors.primary} />
					<Text style={[styles.clearFilterText, { color: colors.primary }]}>Clear</Text>
				</TouchableOpacity>
			</View>
		)
	}, [colors, customerSlug, productSlug, router])

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen options={{ headerShown: false }} />

			<SmartHeader
				navigation={navigation}
				title="Sales"
				subtitle={itemCount > 0 ? `${itemCount} ${itemCount === 1 ? 'item' : 'items'}` : undefined}
				back={navigation.canGoBack() ? { title: 'Back' } : undefined}
				headerBottomHeight={52}
				options={{ onRefresh: handleRefresh, isRefreshing: isRefreshing || countsLoading }}
				headerActions={['refresh']}
				headerBottom={<OrderStatusTabs value={selectedStatus} onChange={setSelectedStatus} options={statusOptions} counts={statusCounts} loading={isRefreshing || countsLoading} />}
			/>

			{isOffline && sales.length === 0 ? (
				<ErrorState icon="cloud-offline-outline" iconOnly />
			) : isInitialLoading ? (
				<View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			) : (
				<OrderList
					data={sales}
					renderItem={renderItem}
					keyExtractor={(item) => item._id}
					numColumns={numColumns}
					isRefreshing={isRefreshing}
					onRefresh={handleRefresh}
					onEndReached={loadMore}
					loadingMore={loadingMore}
					emptyIcon="receipt-long"
					ListHeaderComponent={activeFiltersBanner}
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
	},
	activeFiltersBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		marginHorizontal: 16,
		marginTop: 14,
		marginBottom: 12,
		borderRadius: 14,
		borderWidth: 1.5,
		gap: 12
	},
	activeFiltersLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		flex: 1
	},
	activeFiltersTitle: {
		fontSize: 14,
		fontWeight: '700',
		letterSpacing: -0.2
	},
	activeFiltersSubtitle: {
		fontSize: 12,
		marginTop: 2
	},
	clearFilterBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		gap: 4,
		borderWidth: 1,
		borderColor: 'transparent'
	},
	clearFilterText: {
		fontSize: 12,
		fontWeight: '700'
	}
})
