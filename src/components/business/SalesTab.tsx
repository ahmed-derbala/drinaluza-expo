import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert, TouchableOpacity, ScrollView } from 'react-native'
import { getSales, updateSaleOrderStatus } from '../orders/orders.api'
import { OrderItem } from '../orders/orders.interface'
import { useFocusEffect } from '@react-navigation/native'
import { orderStatusEnum, orderStatusColors, orderStatusLabels, getNextValidStatuses } from '../../constants/orderStatus'

export default function SalesTab() {
	const [sales, setSales] = useState<OrderItem[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)

	const loadSales = async (pageNum: number = 1, isRefresh: boolean = false) => {
		try {
			const response = await getSales(pageNum, 10)
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
			loadSales(1, true)
		}, [])
	)

	const onRefresh = useCallback(() => {
		setRefreshing(true)
		loadSales(1, true)
	}, [])

	const loadMore = () => {
		if (hasMore && !loading && !refreshing) {
			loadSales(page + 1, false)
		}
	}

	const handleStatusUpdate = async (orderId: string, newStatus: string) => {
		try {
			setLoading(true)
			await updateSaleOrderStatus({ orderId, status: newStatus })
			Alert.alert('Success', 'Order status updated successfully')
			// Refresh the sales list
			loadSales(1, true)
		} catch (error) {
			console.error('Failed to update order status:', error)
			Alert.alert('Error', 'Failed to update order status')
		} finally {
			setLoading(false)
		}
	}

	const renderStatusButtons = (item: OrderItem) => {
		const nextStatuses = getNextValidStatuses(item.status)
		const canCancel =
			item.status !== orderStatusEnum.CANCELLED_BY_USER &&
			item.status !== orderStatusEnum.CANCELLED_BY_SHOP &&
			item.status !== orderStatusEnum.DELIVERED_TO_USER &&
			item.status !== orderStatusEnum.RECEIVED_BY_USER

		if (nextStatuses.length === 0 && !canCancel) {
			return null
		}

		return (
			<View style={styles.statusButtonsContainer}>
				<Text style={styles.statusButtonsTitle}>Update Status:</Text>
				<ScrollView horizontal showsHorizontalScrollIndicator={false}>
					{nextStatuses.map((status) => (
						<TouchableOpacity key={status} style={[styles.statusButton, { backgroundColor: orderStatusColors[status] }]} onPress={() => handleStatusUpdate(item._id, status)} disabled={loading}>
							<Text style={styles.statusButtonText}>{orderStatusLabels[status]}</Text>
						</TouchableOpacity>
					))}
					{canCancel && (
						<TouchableOpacity
							key="cancel"
							style={[styles.statusButton, styles.cancelButton, { backgroundColor: orderStatusColors[orderStatusEnum.CANCELLED_BY_SHOP] }]}
							onPress={() => handleStatusUpdate(item._id, orderStatusEnum.CANCELLED_BY_SHOP)}
							disabled={loading}
						>
							<Text style={styles.statusButtonText}>Cancel Order</Text>
						</TouchableOpacity>
					)}
				</ScrollView>
			</View>
		)
	}

	const renderSaleItem = ({ item }: { item: OrderItem }) => (
		<View style={styles.card}>
			<Text style={styles.cardTitle}>{item.name}</Text>
			<Text style={styles.cardText}>Customer: {item.customer?.slug || 'Unknown'}</Text>
			<Text style={styles.cardText}>Shop: {item.shop?.name || 'Unknown Shop'}</Text>
			<View style={styles.statusContainer}>
				<Text style={styles.cardText}>Status: </Text>
				<View style={[styles.statusBadge, { backgroundColor: orderStatusColors[item.status] || '#666' }]}>
					<Text style={styles.statusBadgeText}>{orderStatusLabels[item.status] || item.status}</Text>
				</View>
			</View>
			<Text style={styles.cardText}>Date: {new Date(item.createdAt).toLocaleDateString()}</Text>
			{renderStatusButtons(item)}
		</View>
	)

	if (loading && sales.length === 0) {
		return (
			<View style={styles.container}>
				<Text style={styles.loadingText}>Loading sales...</Text>
			</View>
		)
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Sales Overview</Text>
			<FlatList
				data={sales}
				renderItem={renderSaleItem}
				keyExtractor={(item) => item._id}
				contentContainerStyle={styles.list}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" colors={['#fff']} />}
				onEndReached={loadMore}
				onEndReachedThreshold={0.1}
				ListEmptyComponent={<Text style={styles.emptyText}>No sales found</Text>}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 10
	},
	title: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#fff',
		marginBottom: 16,
		paddingHorizontal: 10
	},
	loadingText: {
		color: '#fff',
		fontSize: 16,
		textAlign: 'center',
		marginTop: 50
	},
	list: {
		paddingBottom: 20
	},
	card: {
		backgroundColor: '#333',
		padding: 15,
		marginHorizontal: 10,
		marginBottom: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#444'
	},
	statusContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 3
	},
	statusBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		marginLeft: 5
	},
	statusBadgeText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: 'bold'
	},
	statusButtonsContainer: {
		marginTop: 10,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: '#444'
	},
	statusButtonsTitle: {
		color: '#fff',
		fontSize: 14,
		fontWeight: 'bold',
		marginBottom: 8
	},
	statusButton: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 6,
		marginRight: 8,
		minWidth: 100,
		alignItems: 'center'
	},
	statusButtonText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: 'bold',
		textAlign: 'center'
	},
	cancelButton: {
		borderWidth: 1,
		borderColor: '#fff'
	},
	cardTitle: {
		color: '#fff',
		fontSize: 16,
		fontWeight: 'bold',
		marginBottom: 5
	},
	cardText: {
		color: '#bbb',
		fontSize: 14,
		marginBottom: 3
	},
	emptyText: {
		color: '#bbb',
		fontSize: 16,
		textAlign: 'center',
		marginTop: 50
	}
})
