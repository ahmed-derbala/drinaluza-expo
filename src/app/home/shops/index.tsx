import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Modal, TextInput, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useNavigation } from '@react-navigation/native'
import type { RootNavigationProp } from '@/types/navigation'
import { getMyShops, createShop } from '@/components/shops/shops.api'
import { Shop, CreateShopRequest } from '@/components/shops/shops.interface'

export default function ShopsScreen() {
	const router = useRouter()
	const navigation = useNavigation<RootNavigationProp>()
	const [shops, setShops] = useState<Shop[]>([])
	const [loading, setLoading] = useState<boolean>(true)
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const [modalVisible, setModalVisible] = useState<boolean>(false)
	const [shopName, setShopName] = useState<string>('')
	const [deliveryRadius, setDeliveryRadius] = useState<string>('')
	const [creating, setCreating] = useState<boolean>(false)

	const loadShops = async () => {
		try {
			console.log('Loading shops...')
			const res = await getMyShops()
			console.log('Shops response:', res)
			setShops(res.data.data || [])
		} catch (e) {
			console.error('Error loading shops:', e)
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}

	useEffect(() => {
		loadShops()
	}, [])

	const handleShopPress = (shop: Shop) => {
		navigation.navigate('home/shops/[shopId]/products', {
			shopId: shop._id,
			shopName: shop.name
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

			const response = await createShop(shopData)
			console.log('Shop created:', response)

			// Refresh the shops list
			await loadShops()

			// Close modal and reset form
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

	if (loading) {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>Loading shops...</Text>
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
				renderItem={({ item }) => (
					<TouchableOpacity onPress={() => handleShopPress(item)}>
						<View style={styles.card}>
							<Text style={styles.shopName}>{item.name || 'Unnamed Shop'}</Text>
							{item.owner && (
								<Text style={styles.meta}>
									Owner: {item.owner.name} (@{item.owner.slug})
								</Text>
							)}
							{item.location?.coordinates && item.location.coordinates.length === 2 && (
								<Text style={styles.meta}>{`Location: (${item.location.coordinates[1].toFixed(4)}, ${item.location.coordinates[0].toFixed(4)})`}</Text>
							)}
							{typeof item.deliveryRadiusKm === 'number' && <Text style={styles.meta}>{`Delivery radius: ${item.deliveryRadiusKm} km`}</Text>}
							<Text style={styles.status}>{item.isActive ? 'Active' : 'Inactive'}</Text>
							<Text style={styles.tapHint}>Tap to view products →</Text>
						</View>
					</TouchableOpacity>
				)}
				ListEmptyComponent={<Text style={styles.meta}>You have no shops yet.</Text>}
				contentContainerStyle={{ paddingBottom: 100 }}
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
		padding: 20,
		backgroundColor: '#1a1a1a'
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#fff',
		marginBottom: 16
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
		elevation: 8,
		boxShadow: '0 4px 4.65px rgba(0,0,0,0.3)'
	},
	floatingAddButtonText: {
		color: '#fff',
		fontSize: 28,
		fontWeight: 'bold'
	},
	card: {
		backgroundColor: '#242424',
		padding: 16,
		borderRadius: 8,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#333'
	},
	shopName: {
		fontSize: 18,
		color: '#fff',
		marginBottom: 4
	},
	meta: {
		color: '#bbb',
		marginBottom: 4
	},
	status: {
		marginTop: 4,
		color: '#9ad36a'
	},
	tapHint: {
		marginTop: 8,
		color: '#007AFF',
		fontSize: 14,
		fontStyle: 'italic'
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
