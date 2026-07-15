import { SmartHeader } from '@/core/smart-header'
import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { View, StyleSheet, RefreshControl, ActivityIndicator, useWindowDimensions, Text, ScrollView, TouchableOpacity, Platform } from 'react-native'
import { useTheme, createShadow } from '@/core/theme'
import { useSalesByStatus } from '@/features/sales/useSalesByStatus'
import { getSales, Sale } from '@/features/sales/sales.api'
import SaleCard from '@/features/sales/SaleCard'
import { useFocusEffect, useLocalSearchParams, Stack, useRouter, useNavigation } from 'expo-router'
import ErrorState from '@/features/common/ErrorState'
import { ORDER_STATUSES, orderStatusLabels } from '@/features/orders/orders-statuses'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'

const ITEMS_PER_PAGE = 10

export default function SalesScreen() {
	const { businessSlug, customerSlug, productSlug, status } = useLocalSearchParams<{
		businessSlug: string
		customerSlug?: string
		productSlug?: string
		status?: string
	}>()
	const router = useRouter()
	const { colors } = useTheme()
	const [selectedStatus, setSelectedStatus] = useState<string>(status || 'all')

	useEffect(() => {
		setSelectedStatus(status || 'all')
	}, [status])

	const selectedStatusRef = useRef(selectedStatus)
	useEffect(() => {
		selectedStatusRef.current = selectedStatus
	}, [selectedStatus])

	const [extraSales, setExtraSales] = useState<Sale[]>([])
	const [currentPage, setCurrentPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)
	const [loadingMore, setLoadingMore] = useState(false)

	const { data: salesResponse, isInitialLoading, isRefreshing, isOffline, refresh } = useSalesByStatus({ businessSlug, customerSlug, productSlug, status: selectedStatus })

	const page1Sales = salesResponse?.data?.docs ?? []
	const sales = useMemo(() => [...page1Sales, ...extraSales], [page1Sales, extraSales])

	useEffect(() => {
		setExtraSales([])
		setCurrentPage(1)
		setHasMore(true)
	}, [salesResponse])

	const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
	const { width } = useWindowDimensions()
	const navigation = useNavigation()

	// Responsive layout
	const isDesktop = width >= 1024
	const numColumns = isDesktop ? 2 : 1

	const statusOptions = useMemo(
		() => [
			{ value: 'all', label: 'All Sales' },
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
		[]
	)

	// Load all sales to get counts for each status
	const loadAllSalesForCounts = useCallback(async () => {
		if (!businessSlug) return
		try {
			// Load all sales without status filter to get counts
			const response = await getSales(businessSlug as string, 1, 1000, undefined, customerSlug, productSlug)
			if (response && response.data && Array.isArray(response.data.docs)) {
				const allSalesData = response.data.docs

				// Calculate counts for each status from loaded data
				const counts: Record<string, number> = {
					all: response.data.pagination?.totalDocs || allSalesData.length
				}
				allSalesData.forEach((sale) => {
					counts[sale.status] = (counts[sale.status] || 0) + 1
				})

				setStatusCounts(counts)
			}
		} catch (err) {
			console.error('Error loading sales for counts:', err)
		}
	}, [businessSlug, customerSlug, productSlug])

	const loadMoreSales = useCallback(
		async (nextPage: number) => {
			if (!businessSlug) return
			try {
				setLoadingMore(true)
				const response = await getSales(businessSlug as string, nextPage, ITEMS_PER_PAGE, selectedStatus === 'all' ? undefined : selectedStatus, customerSlug, productSlug)
				if (response && response.data && Array.isArray(response.data.docs)) {
					const newSales = response.data.docs
					setExtraSales((prev) => [...prev, ...newSales])
					const hasMoreVal = newSales.length === ITEMS_PER_PAGE && response.data.pagination?.hasNextPage !== false
					setHasMore(hasMoreVal)
				} else {
					setHasMore(false)
				}
				setCurrentPage(nextPage)
			} catch (err) {
				console.error('Error loading more sales:', err)
			} finally {
				setLoadingMore(false)
			}
		},
		[businessSlug, customerSlug, productSlug, selectedStatus]
	)

	const handleRefresh = useCallback(async () => {
		await loadAllSalesForCounts()
		await refresh()
	}, [loadAllSalesForCounts, refresh])

	const handleLoadMore = useCallback(() => {
		if (!loadingMore && hasMore) {
			loadMoreSales(currentPage + 1)
		}
	}, [loadingMore, hasMore, currentPage, loadMoreSales])

	const handleStatusChange = useCallback(
		(newStatus: string) => {
			setSelectedStatus(newStatus)
			router.setParams({ status: newStatus })
		},
		[router]
	)

	// Focus effect triggers load/silent refresh in background
	useFocusEffect(
		useCallback(() => {
			loadAllSalesForCounts()
			refresh()
		}, [loadAllSalesForCounts, refresh])
	)

	const renderFooter = () => {
		if (!loadingMore) return null
		return (
			<View style={styles.loadingMore}>
				<ActivityIndicator size="small" color={colors.primary} />
			</View>
		)
	}

	const renderItem = useCallback(
		({ item }: { item: Sale }) => (
			<View style={[numColumns > 1 ? styles.columnItem : styles.fullWidthItem, numColumns > 1 && { paddingHorizontal: 8, marginBottom: 16 }]}>
				<SaleCard sale={item} onStatusUpdate={handleRefresh} />
			</View>
		),
		[numColumns, handleRefresh, styles.columnItem, styles.fullWidthItem]
	)

	// Only show full-screen loading on initial load
	if (isInitialLoading) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	const displayData = sales

	if (isOffline && displayData.length === 0) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<Stack.Screen options={{ title: 'Sales' }} />
				<ErrorState icon="cloud-offline-outline" iconOnly />
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen
				options={{
					headerShown: false
				}}
			/>

			{/* Manually render SmartHeader to bypass React Navigation native wrapper touch restrictions */}
			<SmartHeader
				navigation={navigation}
				title="Sales"
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
								const showCount = count > 0 || opt.value === 'all'

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
															color: isSelected ? colors.textOnPrimary : colors.textSecondary
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

			{/* Sales List */}
			<SmartHeader.FlashList
				data={displayData}
				renderItem={renderItem}
				keyExtractor={(item: Sale) => item._id}
				key={numColumns}
				numColumns={numColumns}
				contentContainerStyle={[styles.listContent, numColumns > 1 && { paddingHorizontal: 8 }]}
				refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
				onEndReached={handleLoadMore}
				onEndReachedThreshold={0.5}
				ListFooterComponent={renderFooter}
				ListHeaderComponent={
					customerSlug || productSlug ? (
						<View style={[styles.activeFiltersBanner, { backgroundColor: colors.primaryContainer, borderColor: colors.primary, marginBottom: 12 }]}>
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
							<TouchableOpacity
								onPress={() => {
									router.setParams({ customerSlug: '', productSlug: '' })
								}}
								style={[styles.clearFilterBtn, { backgroundColor: colors.surface }]}
								activeOpacity={0.7}
							>
								<Ionicons name="close" size={16} color={colors.primary} />
								<Text style={[styles.clearFilterText, { color: colors.primary }]}>Clear</Text>
							</TouchableOpacity>
						</View>
					) : null
				}
				ListEmptyComponent={
					isInitialLoading ? (
						<View style={styles.emptyContainer}>
							<ActivityIndicator size="large" color={colors.primary} />
						</View>
					) : (
						<View style={styles.emptyContainer}>
							<MaterialIcons name="receipt-long" size={64} color={colors.textTertiary} style={{ opacity: 0.3 }} />
							<Text style={[styles.emptyTitle, { color: colors.text }]}>No sales found</Text>
							<Text style={[styles.emptyText, { color: colors.textSecondary }]}>
								{selectedStatus !== 'all' ? `No sales with status "${orderStatusLabels[selectedStatus as keyof typeof orderStatusLabels] || selectedStatus}"` : 'Start making sales to see them here'}
							</Text>
						</View>
					)
				}
			/>
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
	columnWrapper: {
		gap: 16
	},
	columnItem: {
		flex: 1,
		minWidth: 0 // Important for flex items to shrink properly
	},
	fullWidthItem: {
		width: '100%'
	},
	loadingMore: {
		paddingVertical: 20,
		alignItems: 'center'
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
	activeFiltersBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		marginHorizontal: 16,
		marginTop: 14,
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
