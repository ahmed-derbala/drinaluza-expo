import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert, TouchableOpacity, ScrollView, Animated, useWindowDimensions } from 'react-native'
import SmartImage from '../common/SmartImage'
import { getSales, updateSaleStatus } from '../orders/orders.api'
import { OrderItem as SaleItem } from '../orders/orders.interface'
import { useFocusEffect } from '@react-navigation/native'
import { useRouter } from 'expo-router'
import { orderStatusEnum, orderStatusColors, orderStatusLabels, getNextValidStatuses } from '../../constants/orderStatus'
import { useTheme } from '../../contexts/ThemeContext'
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons'
import ScreenHeader from '../common/ScreenHeader'
import { showAlert } from '../../utils/popup'

const FILTERS = [
	{ id: 'all', label: 'All' },
	{ id: orderStatusEnum.PENDING_SHOP_CONFIRMATION, label: 'Pending' },
	{ id: orderStatusEnum.CONFIRMED_BY_SHOP, label: 'Confirmed' },
	{ id: orderStatusEnum.RESERVED_BY_SHOP_FOR_PICKUP_BY_CUSTOMER, label: 'Ready' },
	{ id: orderStatusEnum.DELIVERING_TO_CUSTOMER, label: 'Delivering' },
	{ id: orderStatusEnum.DELIVERED_TO_CUSTOMER, label: 'Completed' },
	{ id: orderStatusEnum.CANCELLED_BY_SHOP, label: 'Cancelled' }
]

export default function SalesTab() {
	const { colors, isDark } = useTheme()
	const router = useRouter()
	const [sales, setSales] = useState<SaleItem[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)
	const [activeFilter, setActiveFilter] = useState('all')
	const [actionLoading, setActionLoading] = useState<string | null>(null)

	const fadeAnim = useRef(new Animated.Value(0)).current
	const { width } = useWindowDimensions()

	const numColumns = useMemo(() => {
		if (width > 1400) return 4
		if (width > 1100) return 3
		if (width > 700) return 2
		return 1
	}, [width])

	const styles = useMemo(() => createStyles(colors, isDark, width, numColumns), [colors, isDark, width, numColumns])

	const loadSales = async (pageNum: number = 1, isRefresh: boolean = false, status: string = activeFilter) => {
		try {
			if (pageNum === 1 && !isRefresh) setLoading(true)

			const response = await getSales(pageNum, 10, status === 'all' ? undefined : status)
			const newSales = response.data.docs || []

			if (isRefresh || pageNum === 1) {
				setSales(newSales)
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 400,
					useNativeDriver: true
				}).start()
			} else {
				setSales((prev) => [...prev, ...newSales])
			}

			setHasMore(response.data.pagination.hasNextPage)
			setPage(pageNum)
		} catch (error: any) {
			console.error('Failed to load sales:', error)
			const errorMessage = error.response?.data?.message || 'Failed to load sales data'
			showAlert('Error', errorMessage)
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}

	useFocusEffect(
		useCallback(() => {
			loadSales(1, true, activeFilter)
		}, [activeFilter])
	)

	const onRefresh = useCallback(() => {
		setRefreshing(true)
		loadSales(1, true, activeFilter)
	}, [activeFilter])

	const loadMore = () => {
		if (hasMore && !loading && !refreshing) {
			loadSales(page + 1, false, activeFilter)
		}
	}

	const handleFilterPress = (filterId: string) => {
		if (filterId === activeFilter) return
		setActiveFilter(filterId)
		setSales([])
		setLoading(true)
		fadeAnim.setValue(0)
	}

	const handleStatusUpdate = async (saleId: string, newStatus: string) => {
		try {
			setActionLoading(saleId)
			await updateSaleStatus({ saleId, status: newStatus })
			onRefresh()
			showAlert('Success', 'Order status updated')
		} catch (error: any) {
			console.error('Failed to update sale status:', error)
			const errorMessage = error.response?.data?.message || 'Failed to update sale status'
			showAlert('Error', errorMessage)
		} finally {
			setActionLoading(null)
		}
	}

	const renderFilterItem = (item: (typeof FILTERS)[0]) => {
		const isActive = item.id === activeFilter
		return (
			<TouchableOpacity
				key={item.label}
				style={[styles.filterChip, isActive && { backgroundColor: colors.primary, borderColor: colors.primary }, !isActive && { backgroundColor: colors.card, borderColor: colors.border }]}
				onPress={() => handleFilterPress(item.id)}
			>
				<Text style={[styles.filterText, { color: isActive ? '#fff' : colors.textSecondary, fontWeight: isActive ? '700' : '500' }]}>{item.label}</Text>
			</TouchableOpacity>
		)
	}

	const renderStatusActions = (item: SaleItem) => {
		const nextStatuses = getNextValidStatuses(item.status)
		const canCancel =
			item.status !== orderStatusEnum.CANCELLED_BY_CUSTOMER &&
			item.status !== orderStatusEnum.CANCELLED_BY_SHOP &&
			item.status !== orderStatusEnum.DELIVERED_TO_CUSTOMER &&
			item.status !== orderStatusEnum.RECEIVED_BY_CUSTOMER

		if (nextStatuses.length === 0 && !canCancel) return null

		return (
			<View style={styles.actionsContainer}>
				{nextStatuses.map((status) => (
					<TouchableOpacity
						key={status}
						style={[styles.actionButton, { backgroundColor: orderStatusColors[status] || colors.primary }]}
						onPress={() => handleStatusUpdate(item._id, status)}
						disabled={!!actionLoading}
					>
						{actionLoading === item._id ? (
							<Text style={styles.actionButtonText}>...</Text>
						) : (
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
								<Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
								<Text style={styles.actionButtonText}>{orderStatusLabels[status]}</Text>
							</View>
						)}
					</TouchableOpacity>
				))}
				{canCancel && (
					<TouchableOpacity
						style={[styles.actionButton, styles.cancelButton, { backgroundColor: colors.error + '15' }]}
						onPress={() => handleStatusUpdate(item._id, orderStatusEnum.CANCELLED_BY_SHOP)}
						disabled={!!actionLoading}
					>
						<Ionicons name="close-circle-outline" size={16} color={colors.error} />
						<Text style={[styles.actionButtonText, { color: colors.error }]}>Cancel</Text>
					</TouchableOpacity>
				)}
			</View>
		)
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

	const getStatusIcon = (status: string) => {
		switch (status) {
			case orderStatusEnum.PENDING_SHOP_CONFIRMATION:
				return 'time-outline'
			case orderStatusEnum.CONFIRMED_BY_SHOP:
				return 'storefront-outline'
			case orderStatusEnum.RESERVED_BY_SHOP_FOR_PICKUP_BY_CUSTOMER:
				return 'bag-check-outline'
			case orderStatusEnum.DELIVERING_TO_CUSTOMER:
				return 'bicycle-outline'
			case orderStatusEnum.DELIVERED_TO_CUSTOMER:
				return 'checkmark-done-outline'
			case orderStatusEnum.CANCELLED_BY_SHOP:
				return 'close-circle-outline'
			default:
				return 'receipt-outline'
		}
	}

	const renderSaleItem = ({ item }: { item: SaleItem }) => {
		const totalPrice = item.price?.total?.tnd || item.products.reduce((sum, p) => sum + (p.quantity || 0) * (p.product?.price?.total?.tnd || 0), 0)
		const statusColor = orderStatusColors[item.status] || colors.textSecondary

		const scaleAnim = new Animated.Value(1)
		const handlePressIn = () => {
			Animated.spring(scaleAnim, {
				toValue: 0.97,
				useNativeDriver: true,
				friction: 8,
				tension: 100
			}).start()
		}

		const handlePressOut = () => {
			Animated.spring(scaleAnim, {
				toValue: 1,
				useNativeDriver: true,
				friction: 8,
				tension: 100
			}).start()
		}

		const containerWidth = (width - 24) / numColumns

		return (
			<Animated.View style={{ transform: [{ scale: scaleAnim }], width: containerWidth }}>
				<TouchableOpacity
					style={[styles.card, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
					activeOpacity={0.9}
					onPressIn={handlePressIn}
					onPressOut={handlePressOut}
				>
					<View style={styles.cardHeader}>
						<View style={styles.headerLeft}>
							<View style={[styles.iconContainer, { backgroundColor: statusColor + '15' }]}>
								<Ionicons name={getStatusIcon(item.status) as any} size={24} color={statusColor} />
							</View>
							<View style={styles.headerInfo}>
								<Text style={[styles.customerName, { color: colors.text }]}>
									{item.customer?.slug || (typeof item.customer?.name === 'object' ? (item.customer.name as any).en : item.customer?.name) || 'Unknown Customer'}
								</Text>
								<Text style={[styles.orderDate, { color: colors.textSecondary }]}>
									{formatDate(item.createdAt)} • #{item._id.slice(-6).toUpperCase()}
								</Text>
							</View>
						</View>
						<View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
							<Text style={[styles.statusText, { color: statusColor }]}>{orderStatusLabels[item.status] || item.status}</Text>
						</View>
					</View>

					<View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} />

					<View style={styles.cardBody}>
						<View style={styles.productsList}>
							{item.products.slice(0, 3).map((p, index) => {
								const imageUrl = p.product?.media?.thumbnail?.url || p.product?.defaultProduct?.media?.thumbnail?.url || p.product?.photos?.[0]
								return (
									<View key={index} style={styles.productItem}>
										<SmartImage source={{ uri: imageUrl || '' }} style={styles.productImage} resizeMode="cover" fallbackIcon="image" />
										<View style={{ flex: 1, justifyContent: 'center' }}>
											<Text style={[styles.productText, { color: colors.text }]} numberOfLines={1}>
												{p.product?.name?.en}
											</Text>
											<Text style={{ fontSize: 12, color: colors.textSecondary }}>Qty: {p.quantity}</Text>
										</View>
									</View>
								)
							})}
							{item.products.length > 3 && <Text style={[styles.moreItemsText, { color: colors.textTertiary }]}>+ {item.products.length - 3} more items</Text>}
						</View>

						<View style={styles.totalRow}>
							<View style={styles.totalLabelContainer}>
								<Ionicons name="pricetag-outline" size={14} color={colors.textTertiary} />
								<Text style={[styles.totalLabel, { color: colors.textTertiary }]}>Total Amount</Text>
							</View>
							<Text style={[styles.totalValue, { color: colors.primary }]}>{totalPrice.toFixed(2)} TND</Text>
						</View>
					</View>

					{renderStatusActions(item)}
				</TouchableOpacity>
			</Animated.View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScreenHeader
				title="Sales"
				subtitle={`${sales.length} ${sales.length === 1 ? 'order' : 'orders'}`}
				showBack={true}
				onBackPress={() => router.back()}
				rightActions={
					<TouchableOpacity onPress={onRefresh} disabled={refreshing}>
						<Ionicons name={refreshing ? 'hourglass-outline' : 'refresh-outline'} size={24} color={colors.text} />
					</TouchableOpacity>
				}
			/>

			<View style={styles.filterContainer}>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollProps}>
					{FILTERS.map(renderFilterItem)}
				</ScrollView>
			</View>

			<Animated.FlatList
				key={numColumns}
				numColumns={numColumns}
				data={sales}
				renderItem={renderSaleItem}
				keyExtractor={(item) => item._id}
				contentContainerStyle={styles.list}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
				onEndReached={loadMore}
				onEndReachedThreshold={0.2}
				style={{ opacity: fadeAnim }}
				ListEmptyComponent={
					!loading ? (
						<View style={styles.emptyContainer}>
							<View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '10' }]}>
								<FontAwesome5 name="clipboard-list" size={48} color={colors.primary} />
							</View>
							<Text style={[styles.emptyTitle, { color: colors.text }]}>No orders found</Text>
							<Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{activeFilter === 'all' ? 'You have no sales yet.' : 'There are no orders with this status yet.'}</Text>
						</View>
					) : null
				}
				ListFooterComponent={
					loading && sales.length > 0 ? (
						<View style={{ padding: 20 }}>
							<Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Loading...</Text>
						</View>
					) : null
				}
			/>
		</View>
	)
}

const createStyles = (colors: any, isDark: boolean, width: number, numColumns: number) => {
	const isTablet = width > 700

	return StyleSheet.create({
		container: {
			flex: 1
		},
		filterContainer: {
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
		},
		filterScrollProps: {
			paddingHorizontal: 16,
			gap: 8
		},
		filterChip: {
			paddingHorizontal: 16,
			paddingVertical: 8,
			borderRadius: 20,
			borderWidth: 1,
			alignItems: 'center',
			justifyContent: 'center'
		},
		filterText: {
			fontSize: 13
		},
		list: {
			padding: 10
		},
		card: {
			flex: 1,
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
			width: numColumns === 1 && isTablet ? 600 : undefined,
			alignSelf: numColumns === 1 && isTablet ? 'center' : undefined,
			maxWidth: numColumns === 1 && isTablet ? '100%' : undefined
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
		orderIdContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 6
		},
		customerName: {
			fontSize: 16,
			fontWeight: '700',
			marginBottom: 2
		},
		orderDate: {
			fontSize: 13,
			fontWeight: '500'
		},
		statusBadge: {
			paddingHorizontal: 10,
			paddingVertical: 4,
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
			backgroundColor: 'rgba(150,150,150,0.1)',
			marginVertical: 12
		},
		cardBody: {
			gap: 8
		},
		productsList: {
			marginBottom: 12
		},
		productItem: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 12,
			marginBottom: 8
		},
		productImage: {
			width: 40,
			height: 40,
			borderRadius: 8
		},
		productImagePlaceholder: {
			justifyContent: 'center',
			alignItems: 'center'
		},
		productText: {
			fontSize: 14,
			fontWeight: '600'
		},
		moreItemsText: {
			fontSize: 12,
			fontStyle: 'italic',
			marginTop: 4,
			marginLeft: 52
		},
		totalRow: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginTop: 4,
			paddingTop: 8,
			borderTopWidth: 1,
			borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
		},
		totalLabelContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 6
		},
		totalLabel: {
			fontSize: 13,
			fontWeight: '500'
		},
		totalValue: {
			fontSize: 18,
			fontWeight: '800'
		},
		actionsContainer: {
			marginTop: 16,
			flexDirection: 'row',
			flexWrap: 'wrap',
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
			minWidth: 80,
			justifyContent: 'center'
		},
		actionButtonText: {
			color: '#fff',
			fontSize: 13,
			fontWeight: '600'
		},
		cancelButton: {},
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
		emptySubtitle: {
			fontSize: 15,
			color: 'rgba(150,150,150,0.7)',
			textAlign: 'center'
		}
	})
}
