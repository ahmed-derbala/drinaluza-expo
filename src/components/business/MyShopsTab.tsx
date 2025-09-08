import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Modal, TextInput, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { getMyShops, createShop } from '@/components/shops/shops.api'
import { Shop, CreateShopRequest } from '@/components/shops/shops.interface'
import { useFocusEffect } from '@react-navigation/native'

export default function MyShopsTab() {
	const router = useRouter()
	const [shops, setShops] = useState<Shop[]>([])
	const [loading, setLoading] = useState<boolean>(true)
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const [modalVisible, setModalVisible] = useState<boolean>(false)
	const [shopName, setShopName] = useState<string>('')
	const [deliveryRadius, setDeliveryRadius] = useState<string>('')
	const [creating, setCreating] = useState<boolean>(false)

	const loadShops = async () => {
		try {
			const res = await getMyShops()
			setShops(res.data.data || [])
		} catch (e) {
			console.error('Error loading shops:', e)
			Alert.alert('Error', 'Failed to load shops')
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}

	useFocusEffect(
		useCallback(() => {
			loadShops()
		}, [])
	)

	const handleShopPress = (shop: Shop) => {
		router.push({
			pathname: '/home/shops/[shopId]/products',
			params: {
				shopId: shop._id,
				shopName: shop.name
			}
		})
	}

	const onRefresh = () => {
		setRefreshing(true)
		loadShops()
	}

	const handleCreateShop = async () => {
		if (!shopName.trim()) {
			Alert.alert('Error', 'Please enter a shop name')
			return
		}

		setCreating(true)
		try {
			const shopData: CreateShopRequest = {
				name: shopName.trim(),
				location: {
					type: 'Point'
				}
			}

			if (deliveryRadius.trim()) {
				const radius = parseFloat(deliveryRadius)
				if (!isNaN(radius) && radius > 0) {
					shopData.deliveryRadiusKm = radius
				}
			}

			await createShop(shopData)
			await loadShops()

			setModalVisible(false)
			setShopName('')
			setDeliveryRadius('')

			Alert.alert('Success', 'Shop created successfully!')
		} catch (error) {
			console.error('Error creating shop:', error)
			Alert.alert('Error', 'Failed to create shop. Please try again.')
		} finally {
			setCreating(false)
		}
	}

	const renderShopItem = ({ item }: { item: Shop }) => (
		<TouchableOpacity onPress={() => handleShopPress(item)}>
			<View style={styles.card}>
				<Text style={styles.shopName}>{item.name || 'Unnamed Shop'}</Text>
				{item.owner && (
					<Text style={styles.meta}>
						Owner: {item.owner.name} (@{item.owner.slug})
					</Text>
				)}
				{item.location?.coordinates && item.location.coordinates.length === 2 && (
					<Text style={styles.meta}>
						Location: ({item.location.coordinates[1].toFixed(4)}, {item.location.coordinates[0].toFixed(4)})
					</Text>
				)}
				{typeof item.deliveryRadiusKm === 'number' && <Text style={styles.meta}>Delivery radius: {item.deliveryRadiusKm} km</Text>}
				<Text style={styles.status}>{item.isActive ? 'Active' : 'Inactive'}</Text>
				<Text style={styles.tapHint}>Tap to view products →</Text>
			</View>
		</TouchableOpacity>
	)

	if (loading) {
		return (
			<View style={styles.container}>
				<Text style={styles.loadingText}>Loading shops...</Text>
			</View>
		)
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>My Shops</Text>
			<FlatList
				data={shops}
				keyExtractor={(item) => item._id}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" colors={['#fff']} />}
				renderItem={renderShopItem}
				ListEmptyComponent={<Text style={styles.emptyText}>You have no shops yet.</Text>}
				contentContainerStyle={styles.list}
			/>

			<TouchableOpacity style={styles.floatingAddButton} onPress={() => setModalVisible(true)}>
				<Text style={styles.floatingAddButtonText}>+</Text>
			</TouchableOpacity>

			<Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Create New Shop</Text>

						<Text style={styles.inputLabel}>Shop Name *</Text>
						<TextInput style={styles.input} value={shopName} onChangeText={setShopName} placeholder="Enter shop name" placeholderTextColor="#666" />

						<Text style={styles.inputLabel}>Delivery Radius (km)</Text>
						<TextInput style={styles.input} value={deliveryRadius} onChangeText={setDeliveryRadius} placeholder="Enter delivery radius" placeholderTextColor="#666" keyboardType="numeric" />

						<View style={styles.modalButtons}>
							<TouchableOpacity
								style={[styles.modalButton, styles.cancelButton]}
								onPress={() => {
									setModalVisible(false)
									setShopName('')
									setDeliveryRadius('')
								}}
							>
								<Text style={styles.cancelButtonText}>Cancel</Text>
							</TouchableOpacity>

							<TouchableOpacity style={[styles.modalButton, styles.createButton]} onPress={handleCreateShop} disabled={creating}>
								<Text style={styles.createButtonText}>{creating ? 'Creating...' : 'Create Shop'}</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
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
		paddingBottom: 100
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
	shopName: {
		fontSize: 16,
		color: '#fff',
		fontWeight: 'bold',
		marginBottom: 5
	},
	meta: {
		color: '#bbb',
		fontSize: 14,
		marginBottom: 3
	},
	status: {
		marginTop: 5,
		color: '#9ad36a',
		fontSize: 14
	},
	tapHint: {
		marginTop: 8,
		color: '#007AFF',
		fontSize: 14,
		fontStyle: 'italic'
	},
	emptyText: {
		color: '#bbb',
		fontSize: 16,
		textAlign: 'center',
		marginTop: 50
	},
	floatingAddButton: {
		position: 'absolute',
		bottom: 20,
		right: 20,
		backgroundColor: '#007AFF',
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: 'center',
		alignItems: 'center',
		boxShadow: '0 4px 4.65px rgba(0,0,0,0.3)'
	},
	floatingAddButtonText: {
		color: '#fff',
		fontSize: 28,
		fontWeight: 'bold'
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center'
	},
	modalContent: {
		backgroundColor: '#242424',
		borderRadius: 12,
		padding: 20,
		width: '90%',
		maxWidth: 400
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#fff',
		marginBottom: 20,
		textAlign: 'center'
	},
	inputLabel: {
		fontSize: 16,
		color: '#fff',
		marginBottom: 8,
		marginTop: 12
	},
	input: {
		backgroundColor: '#333',
		borderRadius: 8,
		padding: 12,
		color: '#fff',
		fontSize: 16,
		borderWidth: 1,
		borderColor: '#555'
	},
	modalButtons: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 20
	},
	modalButton: {
		flex: 1,
		padding: 12,
		borderRadius: 8,
		marginHorizontal: 5
	},
	cancelButton: {
		backgroundColor: '#666'
	},
	createButton: {
		backgroundColor: '#007AFF'
	},
	cancelButtonText: {
		color: '#fff',
		textAlign: 'center',
		fontWeight: 'bold'
	},
	createButtonText: {
		color: '#fff',
		textAlign: 'center',
		fontWeight: 'bold'
	}
})
