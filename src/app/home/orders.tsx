import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Button } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getOrder, createOrder } from '@/components/orders/orders.api'
import { OrderItem } from '@/components/orders/orders.interface'

export default function OrdersScreen() {
	const [orderItems, setOrderItems] = useState<OrderItem[]>([])
	const [basket, setBasket] = useState<OrderItem[]>([])
	const [selectedTab, setSelectedTab] = useState(0) // 0 for Basket, 1 for Orders

	useEffect(() => {
		const loadBasket = async () => {
			try {
				const storedBasket = await AsyncStorage.getItem('basket')
				//console.log(storedBasket)
				if (storedBasket) setBasket(JSON.parse(storedBasket))
			} catch (error) {
				console.error('Failed to load basket:', error)
			}
		}

		const fetchOrder = async () => {
			try {
				const response = await getOrder()
				setOrderItems(response.data.data)
			} catch (error) {
				console.error('Failed to fetch order:', error)
			}
		}

		loadBasket()
		fetchOrder()
	}, [])

	const addToBasket = async (item: OrderItem) => {
		try {
			const newBasket = [...basket, item]
			setBasket(newBasket)
			await AsyncStorage.setItem('basket', JSON.stringify(newBasket))
			Alert.alert('Success', `${item.name} added to basket`)
		} catch (error) {
			console.error('Failed to add to basket:', error)
			Alert.alert('Error', 'Failed to add item to basket')
		}
	}

	const removeFromBasket = async (itemId: string) => {
		try {
			const newBasket = basket.filter((item) => item._id !== itemId)
			setBasket(newBasket)
			await AsyncStorage.setItem('basket', JSON.stringify(newBasket))
			Alert.alert('Success', 'Item removed from basket')
		} catch (error) {
			console.error('Failed to remove from basket:', error)
			Alert.alert('Error', 'Failed to remove item from basket')
		}
	}

	const groupItemsByShop = (items: OrderItem[]) => {
		const grouped: { [shopId: string]: { shopName: string; items: OrderItem[] } } = {}

		items.forEach((item) => {
			const shopId = item.shop?._id || 'unknown'
			const shopName = item.shop?.name || 'Unknown Shop'
			if (!grouped[shopId]) {
				grouped[shopId] = { shopName, items: [] }
			}
			grouped[shopId].items.push(item)
		})

		return Object.entries(grouped).map(([shopId, group]) => ({
			shopId,
			shopName: group.shopName,
			items: group.items
		}))
	}

	const renderItem = ({ item }: { item: OrderItem }) => (
		<View style={styles.card}>
			<Text style={styles.cardTitle}>{item.name}</Text>
			<Text style={styles.cardText}>Business: {item.business.name}</Text>
			<Text style={styles.cardText}>Shop: {item?.shop?.name}</Text>
			<Text style={styles.cardText}>Created by: {item.createdByUser.username}</Text>

			{selectedTab === 1 ? (
				<View style={styles.buttonContainer}>
					<Button title="Add to Basket" onPress={() => addToBasket(item)} color="#007AFF" />
				</View>
			) : (
				<View style={styles.buttonContainer}>
					<Button title="Remove" onPress={() => removeFromBasket(item._id)} color="#FF3B30" />
				</View>
			)}
		</View>
	)

	return (
		<View style={styles.container}>
			{/* Top Bar Switch */}
			<View style={styles.topBar}>
				<TouchableOpacity style={[styles.tab, selectedTab === 0 && styles.activeTab]} onPress={() => setSelectedTab(0)}>
					<Text style={[styles.tabText, selectedTab === 0 && styles.activeTabText]}>Basket ({basket.length})</Text>
				</TouchableOpacity>
				<TouchableOpacity style={[styles.tab, selectedTab === 1 && styles.activeTab]} onPress={() => setSelectedTab(1)}>
					<Text style={[styles.tabText, selectedTab === 1 && styles.activeTabText]}>Orders</Text>
				</TouchableOpacity>
			</View>

			{selectedTab === 0 ? (
				<FlatList
					data={groupItemsByShop(basket)}
					keyExtractor={(group) => group.shopId}
					renderItem={({ item: group }) => (
						<View style={{ marginBottom: 20 }}>
							<Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>🏪 {group.shopName}</Text>
							{group.items.map((item) => (
								<View key={item._id} style={styles.card}>
									<Text style={styles.cardTitle}>{item.name}</Text>
									<Text style={styles.cardText}>Created by: {item.createdByUser.username}</Text>
									<View style={styles.buttonContainer}>
										<Button title="Remove" onPress={() => removeFromBasket(item._id)} color="#FF3B30" />
									</View>
								</View>
							))}
							<Button title="Buy All from This Shop" onPress={() => handleBuy(group.items)} color="#34C759" accessibilityLabel={`Buy items from ${group.shopName}`} />
						</View>
					)}
					contentContainerStyle={styles.list}
				/>
			) : (
				<FlatList data={orderItems} renderItem={renderItem} keyExtractor={(item) => item._id} contentContainerStyle={styles.list} />
			)}
		</View>
	)
}

const handleBuy = async (shopItems: OrderItem[]) => {
	try {
		//console.log(shopItems)
		//console.log('*****')
		const response = await createOrder({ products: shopItems })
		// Optional: Remove bought items from basket
		const remaining = basket.filter((item) => !shopItems.some((si) => si._id === item._id))
		setBasket(remaining)
		await AsyncStorage.setItem('basket', JSON.stringify(remaining))

		Alert.alert('Success', 'Order placed successfully!')
	} catch (error) {
		console.error('Failed to place order:', error)
		Alert.alert('Error', 'Failed to place order')
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#1a1a1a'
	},
	topBar: {
		flexDirection: 'row',
		margin: 10,
		backgroundColor: '#333',
		borderRadius: 8,
		overflow: 'hidden'
	},
	tab: {
		flex: 1,
		padding: 12,
		alignItems: 'center',
		justifyContent: 'center'
	},
	activeTab: {
		backgroundColor: '#007AFF'
	},
	tabText: {
		color: '#aaa',
		fontWeight: '600'
	},
	activeTabText: {
		color: '#fff'
	},
	list: {
		padding: 10
	},
	card: {
		backgroundColor: '#333',
		padding: 15,
		marginBottom: 10,
		borderRadius: 5
	},
	cardTitle: {
		color: '#fff',
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 5
	},
	cardText: {
		color: '#fff',
		fontSize: 14,
		marginBottom: 5
	},
	buttonContainer: {
		marginTop: 10
	}
})
