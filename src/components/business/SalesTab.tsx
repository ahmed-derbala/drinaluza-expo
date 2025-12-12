import React, { useEffect, useState, useCallback, useRef } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert, TouchableOpacity, ScrollView, Animated, Image } from 'react-native'
import { getSales, updateSaleStatus } from '../orders/orders.api'
import { OrderItem as SaleItem } from '../orders/orders.interface'
import { useFocusEffect } from '@react-navigation/native'
import { orderStatusEnum, orderStatusColors, orderStatusLabels, getNextValidStatuses } from '../../constants/orderStatus'
import { useTheme } from '../../contexts/ThemeContext'
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons'
import ScreenHeader from '../common/ScreenHeader'

const FILTERS = [
	{ id: '', label: 'All' },
	{ id: orderStatusEnum.PENDING_SHOP_CONFIRMATION, label: 'Pending' },
	{ id: orderStatusEnum.CONFIRMED_BY_SHOP, label: 'Confirmed' },
	{ id: orderStatusEnum.RESERVED_BY_SHOP_FOR_PICKUP_BY_CUSTOMER, label: 'Ready' },
	{ id: orderStatusEnum.DELIVERING_TO_CUSTOMER, label: 'Delivering' },
	{ id: orderStatusEnum.DELIVERED_TO_CUSTOMER, label: 'Completed' },
	{ id: orderStatusEnum.CANCELLED_BY_SHOP, label: 'Cancelled' }
]

export default function SalesTab() {
	const { colors } = useTheme()
	const [sales, setSales] = useState<SaleItem[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)
	const [activeFilter, setActiveFilter] = useState('')
	const [actionLoading, setActionLoading] = useState<string | null>(null)

	const loadSales = async (pageNum: number = 1, isRefresh: boolean = false, status: string = activeFilter) => {
		try {
			if (pageNum === 1 && !isRefresh) setLoading(true)

			const response = await getSales(pageNum, 10, status)
			const newSales = response.data.data || []

			if (isRefresh || pageNum === 1) {
				setSales(newSales)
			} else {
				setSales((prev) => [...prev, ...newSales])
			}

			setHasMore(response.data.pagination.hasNextPage)
			setPage(pageNum)
		} catch (error) {
			console.error('Failed to load sales:', error)
			Alert.alert('Error', 'Failed to load sales data')
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
		// loadSales will be triggered by useFocusEffect dependency or we call it directly?
		// useFocusEffect callback dependency update will trigger it?
		// better to just call it and let effect handle focus
		// Actually, changing state inside the effect dependency array might cause loops if not careful,
		// but here activeFilter change should trigger the effect re-run which calls loadSales.
		setSales([])
		setLoading(true)
	}

	const handleStatusUpdate = async (saleId: string, newStatus: string) => {
		try {
			setActionLoading(saleId)
			await updateSaleStatus({ saleId, status: newStatus })
			// Optimistic update or refresh? Refresh is safer for consistency
			onRefresh()
			Alert.alert('Success', 'Order status updated')
		} catch (error) {
			console.error('Failed to update sale status:', error)
			Alert.alert('Error', 'Failed to update sale status')
		} finally {
			setActionLoading(null)
		}
	}

	const renderFilterItem = (item: (typeof FILTERS)[0]) => {
		const isActive = item.id === activeFilter
		return (
			<TouchableOpacity
				key={item.label}
				style={[
					styles.filterChip,
					{
						backgroundColor: isActive ? colors.primary : colors.card,
						borderColor: isActive ? colors.primary : colors.border
					}
				]}
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
						{actionLoading === item._id ? <Text style={styles.actionButtonText}>...</Text> : <Text style={styles.actionButtonText}>{orderStatusLabels[status]}</Text>}
					</TouchableOpacity>
				))}
				{canCancel && (
					<TouchableOpacity
						style={[styles.actionButton, styles.cancelButton, { borderColor: colors.error }]}
						onPress={() => handleStatusUpdate(item._id, orderStatusEnum.CANCELLED_BY_SHOP)}
						disabled={!!actionLoading}
					>
						<Text style={[styles.actionButtonText, { color: colors.error }]}>Cancel</Text>
					</TouchableOpacity>
				)}
			</View>
		)
	}

	const renderSaleItem = ({ item }: { item: SaleItem }) => {
		const totalPrice = item.products.reduce((sum, p) => sum + (p.finalPrice?.quantity || 1) * (p.product?.price?.value?.tnd || 0), 0)

		return (
			<View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
				<View style={styles.cardHeader}>
					<View style={styles.orderIdContainer}>
						<MaterialIcons name="receipt" size={16} color={colors.primary} />
						<Text style={[styles.orderId, { color: colors.textSecondary }]}>#{item._id.slice(-6).toUpperCase()}</Text>
					</View>
					<View style={[styles.statusBadge, { backgroundColor: `${orderStatusColors[item.status]}15` }]}>
						<Text style={[styles.statusText, { color: orderStatusColors[item.status] }]}>{orderStatusLabels[item.status] || item.status}</Text>
					</View>
				</View>

				<View style={styles.divider} />

				<View style={styles.cardBody}>
					<View style={styles.infoRow}>
						<Ionicons name="person-outline" size={16} color={colors.textSecondary} style={styles.icon} />
						<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Customer:</Text>
						<Text style={[styles.infoValue, { color: colors.text }]}>{item.customer?.slug || item.customer?.name || 'Unknown'}</Text>
					</View>

					<View style={styles.infoRow}>
						<Ionicons name="time-outline" size={16} color={colors.textSecondary} style={styles.icon} />
						<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date:</Text>
						<Text style={[styles.infoValue, { color: colors.text }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
					</View>

					<View style={styles.productsList}>
						{item.products.slice(0, 3).map((p, index) => {
							const imageUrl = p.product?.DefaultProduct?.images?.thumbnail?.url
							return (
								<View key={index} style={styles.productItem}>
									{imageUrl ? (
										<Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
									) : (
										<View style={[styles.productImage, styles.productImagePlaceholder]}>
											<Ionicons name="image-outline" size={16} color={colors.textTertiary} />
										</View>
									)}
									<Text style={[styles.productText, { color: colors.textSecondary }]} numberOfLines={1}>
										{p.finalPrice?.quantity}x {p.product?.name}
									</Text>
								</View>
							)
						})}
						{item.products.length > 3 && <Text style={[styles.productText, { color: colors.textTertiary, fontStyle: 'italic', marginTop: 4 }]}>+ {item.products.length - 3} more items</Text>}
					</View>

					<View style={styles.totalRow}>
						<Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
						<Text style={[styles.totalValue, { color: colors.primary }]}>{totalPrice.toFixed(2)} TND</Text>
					</View>
				</View>

				{renderStatusActions(item)}
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScreenHeader
				showBack={false}
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

			<FlatList
				data={sales}
				renderItem={renderSaleItem}
				keyExtractor={(item) => item._id}
				contentContainerStyle={styles.list}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
				onEndReached={loadMore}
				onEndReachedThreshold={0.2}
				ListEmptyComponent={
					!loading ? (
						<View style={styles.emptyContainer}>
							<FontAwesome5 name="clipboard-list" size={48} color={colors.border} />
							<Text style={[styles.emptyText, { color: colors.textSecondary }]}>No orders found</Text>
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

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	filterContainer: {
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(150,150,150,0.1)'
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
		fontSize: 14
	},
	list: {
		padding: 16,
		paddingBottom: 40
	},
	card: {
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2
		},
		shadowOpacity: 0.05,
		shadowRadius: 3.84,
		elevation: 2
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12
	},
	orderIdContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6
	},
	orderId: {
		fontSize: 14,
		fontWeight: '600',
		letterSpacing: 0.5
	},
	statusBadge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12
	},
	statusText: {
		fontSize: 12,
		fontWeight: '700',
		textTransform: 'capitalize'
	},
	divider: {
		height: 1,
		backgroundColor: 'rgba(150,150,150,0.1)',
		marginBottom: 12
	},
	cardBody: {
		gap: 8
	},
	infoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8
	},
	icon: {
		width: 18
	},
	infoLabel: {
		fontSize: 14,
		fontWeight: '500',
		width: 70
	},
	infoValue: {
		fontSize: 14,
		fontWeight: '600',
		flex: 1
	},
	productsList: {
		marginTop: 8,
		padding: 10,
		backgroundColor: 'rgba(150,150,150,0.05)',
		borderRadius: 8,
		gap: 8
	},
	productItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8
	},
	productImage: {
		width: 40,
		height: 40,
		borderRadius: 8
	},
	productImagePlaceholder: {
		backgroundColor: 'rgba(150,150,150,0.1)',
		justifyContent: 'center',
		alignItems: 'center'
	},
	productText: {
		fontSize: 13,
		lineHeight: 20,
		flex: 1
	},
	totalRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 8,
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: 'rgba(150,150,150,0.1)'
	},
	totalLabel: {
		fontSize: 16,
		fontWeight: '700'
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
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
		minWidth: 80,
		alignItems: 'center'
	},
	actionButtonText: {
		color: '#fff',
		fontSize: 13,
		fontWeight: '600'
	},
	cancelButton: {
		backgroundColor: 'transparent',
		borderWidth: 1
	},
	emptyContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 60,
		opacity: 0.5
	},
	emptyText: {
		fontSize: 16,
		marginTop: 16,
		fontWeight: '500'
	}
})
