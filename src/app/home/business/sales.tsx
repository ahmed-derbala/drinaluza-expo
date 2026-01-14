import React, { useMemo, useState, useCallback } from 'react'
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator, useWindowDimensions, Text, ScrollView, TouchableOpacity, Platform } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { getSales, Sale } from '../../../components/business/sales.api'
import ScreenHeader from '../../../components/common/ScreenHeader'
import SaleCard from '../../../components/business/SaleCard'
import { useFocusEffect } from 'expo-router'
import ErrorState from '../../../components/common/ErrorState'
import { orderStatusEnum, orderStatusLabels } from '../../../constants/orderStatus'
import { MaterialIcons } from '@expo/vector-icons'

const ITEMS_PER_PAGE = 10

export default function SalesScreen() {
	const { colors } = useTheme()
	const [sales, setSales] = useState<Sale[]>([])
	const [allSales, setAllSales] = useState<Sale[]>([]) // Store all sales for counting
	const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [filtering, setFiltering] = useState(false)
	const [error, setError] = useState<{ title: string; message: string } | null>(null)
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)
	const [loadingMore, setLoadingMore] = useState(false)
	const [selectedStatus, setSelectedStatus] = useState<string>('all')
	const { width } = useWindowDimensions()

	// Responsive layout
	const isTablet = width >= 768
	const isDesktop = width >= 1024
	const numColumns = isDesktop ? 2 : 1

	const statusOptions = useMemo(
		() => [
			{ value: 'all', label: 'All Sales' },
			{ value: orderStatusEnum.PENDING_SHOP_CONFIRMATION, label: orderStatusLabels[orderStatusEnum.PENDING_SHOP_CONFIRMATION] },
			{ value: orderStatusEnum.CONFIRMED_BY_SHOP, label: orderStatusLabels[orderStatusEnum.CONFIRMED_BY_SHOP] },
			{ value: orderStatusEnum.RESERVED_BY_SHOP_FOR_PICKUP_BY_CUSTOMER, label: orderStatusLabels[orderStatusEnum.RESERVED_BY_SHOP_FOR_PICKUP_BY_CUSTOMER] },
			{ value: orderStatusEnum.DELIVERING_TO_CUSTOMER, label: orderStatusLabels[orderStatusEnum.DELIVERING_TO_CUSTOMER] },
			{ value: orderStatusEnum.DELIVERED_TO_CUSTOMER, label: orderStatusLabels[orderStatusEnum.DELIVERED_TO_CUSTOMER] },
			{ value: orderStatusEnum.RECEIVED_BY_CUSTOMER, label: orderStatusLabels[orderStatusEnum.RECEIVED_BY_CUSTOMER] },
			{ value: orderStatusEnum.RESERVATION_EXPIRED, label: orderStatusLabels[orderStatusEnum.RESERVATION_EXPIRED] },
			{ value: orderStatusEnum.CANCELLED_BY_CUSTOMER, label: orderStatusLabels[orderStatusEnum.CANCELLED_BY_CUSTOMER] },
			{ value: orderStatusEnum.CANCELLED_BY_SHOP, label: orderStatusLabels[orderStatusEnum.CANCELLED_BY_SHOP] }
		],
		[]
	)

	// Load all sales to get counts for each status
	const loadAllSalesForCounts = async () => {
		try {
			// Load all sales without status filter to get counts
			const response = await getSales(1, 1000)
			if (response && response.data && Array.isArray(response.data.docs)) {
				const allSalesData = response.data.docs
				setAllSales(allSalesData)

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
	}

	const loadSales = async (pageNum = 1, isRefreshing = false, status = selectedStatus, isFiltering = false) => {
		try {
			if (pageNum === 1) {
				if (isFiltering) {
					setFiltering(true)
				} else {
					setLoading(true)
				}
				setError(null)
			} else {
				setLoadingMore(true)
			}

			const response = await getSales(pageNum, ITEMS_PER_PAGE, status === 'all' ? undefined : status)

			// Check if the response has the expected structure
			if (response && response.data && Array.isArray(response.data.docs)) {
				const newSales = response.data.docs

				if (isRefreshing || pageNum === 1) {
					setSales(newSales)
				} else {
					setSales([...sales, ...newSales])
				}

				setHasMore(newSales.length === ITEMS_PER_PAGE && response.data.pagination?.hasNextPage !== false)
			} else {
				if (pageNum === 1) {
					setSales([])
				}
				setHasMore(false)
			}

			setPage(pageNum)
		} catch (err: any) {
			console.error('Error loading sales:', err)

			if (err.statusCode === 404) {
				setSales([])
				setError({
					title: 'No Sales Found',
					message: 'No sales data is available at the moment.'
				})
			} else {
				setError({
					title: 'Error Loading Sales',
					message: err.message || 'Failed to load sales. Please try again later.'
				})
			}
		} finally {
			setLoading(false)
			setRefreshing(false)
			setLoadingMore(false)
			setFiltering(false)
		}
	}

	const handleRefresh = async () => {
		setRefreshing(true)
		await loadAllSalesForCounts()
		loadSales(1, true)
	}

	const handleLoadMore = () => {
		if (!loadingMore && hasMore) {
			loadSales(page + 1)
		}
	}

	const handleStatusChange = (status: string) => {
		setSelectedStatus(status)
		setHasMore(true)
		setPage(1)
		// Don't clear sales immediately - let them stay visible while loading new data
		loadSales(1, false, status, true)
	}

	useFocusEffect(
		useCallback(() => {
			loadAllSalesForCounts()
			loadSales(1, true)
		}, [])
	)

	const renderFooter = () => {
		if (!loadingMore) return null
		return (
			<View style={styles.loadingMore}>
				<ActivityIndicator size="small" color={colors.primary} />
			</View>
		)
	}

	// Only show full-screen loading on initial load, not when filtering
	if (loading && !refreshing && !filtering && sales.length === 0) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	if (error) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<ScreenHeader title="Sales" showBack={true} />
				<ErrorState title={error.title} message={error.message} onRetry={() => loadSales(1, true)} />
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScreenHeader title="Sales" showBack={true} />

			{/* Status Filter */}
			<View style={[styles.filterContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
				<ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === 'web'} contentContainerStyle={styles.filterRow} style={styles.filterScroll}>
					{statusOptions.map((opt) => {
						const isSelected = selectedStatus === opt.value
						const count = statusCounts[opt.value] ?? 0
						const showCount = count > 0 || opt.value === 'all'

						return (
							<TouchableOpacity
								key={opt.value}
								onPress={() => handleStatusChange(opt.value)}
								activeOpacity={0.7}
								style={[
									styles.filterChip,
									{
										backgroundColor: isSelected ? colors.primary : colors.card,
										borderColor: isSelected ? colors.primary : colors.border,
										...Platform.select({
											web: {
												boxShadow: isSelected ? `0 2px 8px ${colors.primary}40` : '0 1px 3px rgba(0, 0, 0, 0.1)'
											}
										})
									}
								]}
							>
								{filtering && isSelected && <ActivityIndicator size="small" color={colors.textOnPrimary} style={styles.filterLoader} />}
								<Text
									style={[
										styles.filterChipText,
										{
											color: isSelected ? colors.textOnPrimary : colors.text,
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
												backgroundColor: isSelected ? colors.textOnPrimary + '20' : colors.primary + '15'
											}
										]}
									>
										<Text
											style={[
												styles.countText,
												{
													color: isSelected ? colors.textOnPrimary : colors.primary,
													fontWeight: '700'
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

			{/* Sales List */}
			<FlatList
				data={sales}
				renderItem={({ item }) => (
					<View style={numColumns > 1 ? styles.columnItem : styles.fullWidthItem}>
						<SaleCard sale={item} />
					</View>
				)}
				keyExtractor={(item) => item._id}
				key={numColumns}
				numColumns={numColumns}
				columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
				contentContainerStyle={styles.listContent}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
				onEndReached={handleLoadMore}
				onEndReachedThreshold={0.5}
				ListFooterComponent={renderFooter}
				ListEmptyComponent={
					<View style={styles.emptyContainer}>
						<MaterialIcons name="receipt-long" size={64} color={colors.textTertiary} style={{ opacity: 0.3 }} />
						<Text style={[styles.emptyTitle, { color: colors.text }]}>No sales found</Text>
						<Text style={[styles.emptyText, { color: colors.textSecondary }]}>
							{selectedStatus !== 'all' ? `No sales with status "${orderStatusLabels[selectedStatus as keyof typeof orderStatusLabels] || selectedStatus}"` : 'Start making sales to see them here'}
						</Text>
					</View>
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
		paddingVertical: 14,
		paddingHorizontal: 4,
		borderBottomWidth: 1,
		...Platform.select({
			web: {
				position: 'sticky',
				top: 0,
				zIndex: 10
			}
		})
	},
	filterScroll: {
		flexGrow: 0
	},
	filterRow: {
		paddingHorizontal: 12,
		gap: 8,
		alignItems: 'center'
	},
	filterChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 24,
		borderWidth: 1.5,
		minHeight: 40,
		gap: 8,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.08,
				shadowRadius: 4
			},
			android: {
				elevation: 2
			}
		})
	},
	filterLoader: {
		marginRight: -4
	},
	filterChipText: {
		fontSize: 14,
		letterSpacing: 0.2
	},
	countBadge: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 12,
		minWidth: 24,
		alignItems: 'center',
		justifyContent: 'center'
	},
	countText: {
		fontSize: 12,
		lineHeight: 16
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
	}
})
