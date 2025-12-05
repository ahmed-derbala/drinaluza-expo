import React, { useState, useEffect, useMemo } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, useWindowDimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'

import AsyncStorage from '@react-native-async-storage/async-storage'
import { FeedItem } from '../../components/feed/feed.interface'

interface OrderItem {
	id: string
	status: 'pending' | 'completed' | 'cancelled'
	total: number
	date: string
	items: number
}

const OrdersScreen = () => {
	const { colors } = useTheme()
	const router = useRouter()
	const { width } = useWindowDimensions()
	const maxWidth = 800
	const isWideScreen = width > maxWidth
	const [refreshing, setRefreshing] = useState(false)
	const [loading, setLoading] = useState(true)
	const [orders, setOrders] = useState<OrderItem[]>([])
	const [basket, setBasket] = useState<any[]>([])
	const [filter, setFilter] = useState<'cart' | 'all' | 'pending' | 'completed'>('cart')
	const params = useLocalSearchParams()

	// Apply filter from URL params if present
	useEffect(() => {
		if (params.filter === 'pending' || params.filter === 'completed') {
			setFilter(params.filter as 'pending' | 'completed')
		}
	}, [params.filter])

	const loadBasket = async () => {
		try {
			const storedBasket = await AsyncStorage.getItem('basket')
			if (storedBasket) {
				setBasket(JSON.parse(storedBasket))
			}
		} catch (error) {
			console.error('Failed to load basket:', error)
		}
	}

	const loadOrders = async () => {
		try {
			// TODO: Replace with actual API call
			// const response = await fetchOrders(filter);
			// setOrders(response.data);

			// Mock data for now
			setTimeout(() => {
				setOrders([
					{ id: '1', status: 'completed', total: 45.99, date: '2023-05-15', items: 2 },
					{ id: '2', status: 'pending', total: 32.5, date: '2023-05-16', items: 1 },
					{ id: '3', status: 'completed', total: 78.25, date: '2023-05-10', items: 3 }
				])
				setLoading(false)
				setRefreshing(false)
			}, 1000)
		} catch (error) {
			console.error('Error loading orders:', error)
			setLoading(false)
			setRefreshing(false)
		}
	}

	const onRefresh = () => {
		setRefreshing(true)
		loadOrders()
		loadBasket()
	}

	useEffect(() => {
		loadOrders()
		loadBasket()
	}, [])

	const filteredOrders = useMemo(() => (filter === 'all' ? orders : orders.filter((order) => order.status === filter)), [orders, filter])

	const renderOrderItem = ({ item }: { item: OrderItem }) => (
		<TouchableOpacity style={[styles.orderItem, { backgroundColor: colors.card }]} onPress={() => router.push(`/home/orders/${item.id}` as any)}>
			<View style={styles.orderHeader}>
				<Text style={[styles.orderId, { color: colors.text }]}>Order #{item.id}</Text>
				<View
					style={[
						styles.statusBadge,
						{
							backgroundColor: item.status === 'completed' ? '#4CAF50' : '#FFA000',
							opacity: 0.2
						}
					]}
				>
					<Text style={[styles.statusText, { color: item.status === 'completed' ? '#4CAF50' : '#FFA000' }]}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Text>
				</View>
			</View>
			<View style={styles.orderDetails}>
				<Text style={[styles.orderDetail, { color: colors.textSecondary }]}>
					{item.items} {item.items === 1 ? 'item' : 'items'} • ${item.total.toFixed(2)}
				</Text>
				<Text style={[styles.orderDate, { color: colors.textTertiary }]}>{new Date(item.date).toLocaleDateString()}</Text>
			</View>
			<MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} style={styles.chevron} />
		</TouchableOpacity>
	)

	const renderBasketItem = ({ item }: { item: any }) => (
		<View style={[styles.orderItem, { backgroundColor: colors.card }]}>
			<View style={styles.orderHeader}>
				<Text style={[styles.orderId, { color: colors.text }]}>{item.name}</Text>
				<View style={[styles.statusBadge, { backgroundColor: colors.primary, opacity: 0.2 }]}>
					<Text style={[styles.statusText, { color: colors.primary }]}>In Cart</Text>
				</View>
			</View>
			<View style={styles.orderDetails}>
				<Text style={[styles.orderDetail, { color: colors.textSecondary }]}>
					{item.quantity} {item.price?.unit?.name || 'units'} • {item.shop?.name}
				</Text>
				<Text style={[styles.orderDate, { color: colors.textTertiary }]}>Total: {((item.price?.value?.tnd || 0) * (item.quantity || 1)).toFixed(2)} TND</Text>
			</View>
		</View>
	)

	if (loading) {
		return (
			<View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	const FilterButton = ({ status }: { status: 'cart' | 'all' | 'pending' | 'completed' }) => (
		<TouchableOpacity style={[styles.filterButton, filter === status && { backgroundColor: colors.primary }, { borderColor: colors.border }]} onPress={() => setFilter(status)}>
			<Text
				style={[
					styles.filterText,
					{
						color: filter === status ? '#fff' : colors.text,
						opacity: filter === status ? 1 : 0.7
					}
				]}
			>
				{status.charAt(0).toUpperCase() + status.slice(1)}
			</Text>
		</TouchableOpacity>
	)

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<View style={styles.responsiveContainer}>
				<View style={styles.header}>
					<TouchableOpacity onPress={() => router.navigate('/home/customer-dashboard')} style={styles.backButton}>
						<MaterialIcons name="arrow-back" size={24} color={colors.text} />
					</TouchableOpacity>
					<Text style={[styles.headerTitle, { color: colors.text }]}>Orders</Text>
				</View>

				<View style={[styles.filterContainer, { borderBottomColor: colors.border }]}>
					<FilterButton status="cart" />
					<FilterButton status="all" />
					<FilterButton status="pending" />
					<FilterButton status="completed" />
				</View>

				{filter === 'cart' ? (
					<FlatList
						data={basket}
						renderItem={renderBasketItem}
						keyExtractor={(item, index) => index.toString()}
						contentContainerStyle={styles.listContent}
						refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
						ListEmptyComponent={
							<View style={styles.emptyContainer}>
								<MaterialIcons name="shopping-cart" size={64} color={colors.textSecondary} style={{ opacity: 0.5 }} />
								<Text style={[styles.emptyText, { color: colors.textSecondary }]}>Your cart is empty</Text>
							</View>
						}
					/>
				) : (
					<FlatList
						data={filteredOrders}
						renderItem={renderOrderItem}
						keyExtractor={(item) => item.id}
						contentContainerStyle={styles.listContent}
						refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
						ListEmptyComponent={
							<View style={styles.emptyContainer}>
								<MaterialIcons name="receipt" size={64} color={colors.textSecondary} style={{ opacity: 0.5 }} />
								<Text style={[styles.emptyText, { color: colors.textSecondary }]}>No orders found</Text>
							</View>
						}
					/>
				)}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center'
	},
	responsiveContainer: {
		flex: 1,
		width: '100%',
		maxWidth: 600
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		paddingTop: 60, // Adjust for status bar
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0'
	},
	backButton: {
		marginRight: 16
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: 'bold'
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	filterContainer: {
		flexDirection: 'row',
		padding: 16,
		borderBottomWidth: 1
	},
	filterButton: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 20,
		marginRight: 8,
		borderWidth: 1
	},
	filterText: {
		fontSize: 14,
		fontWeight: '500'
	},
	listContent: {
		padding: 16
	},
	orderItem: {
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2
	},
	orderHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8
	},
	orderId: {
		fontSize: 16,
		fontWeight: '600',
		marginRight: 8
	},
	statusBadge: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 10
	},
	statusText: {
		fontSize: 12,
		fontWeight: '600'
	},
	orderDetails: {
		flex: 1
	},
	orderDetail: {
		fontSize: 14,
		marginBottom: 4
	},
	orderDate: {
		fontSize: 12
	},
	chevron: {
		marginLeft: 8
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 100
	},
	emptyText: {
		fontSize: 16,
		marginTop: 16,
		textAlign: 'center'
	}
})

export default OrdersScreen
