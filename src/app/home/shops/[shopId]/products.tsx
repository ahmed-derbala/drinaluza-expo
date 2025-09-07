import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Modal, TextInput, Alert, ScrollView } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getShopProducts, createProduct, getDefaultProducts, CreateProductRequest } from '@/components/products/products.api'
import { ProductType } from '@/components/products/products.type'
import { DefaultProduct } from '@/components/products/products.api'

export default function ShopProductsScreen() {
	const { shopId, shopName } = useLocalSearchParams<{ shopId: string; shopName: string }>()
	const router = useRouter()
	const [products, setProducts] = useState<ProductType[]>([])
	const [loading, setLoading] = useState<boolean>(true)
	const [refreshing, setRefreshing] = useState<boolean>(false)
	const [modalVisible, setModalVisible] = useState<boolean>(false)
	const [defaultProducts, setDefaultProducts] = useState<DefaultProduct[]>([])
	const [selectedDefaultProduct, setSelectedDefaultProduct] = useState<DefaultProduct | null>(null)
	const [productName, setProductName] = useState<string>('')
	const [price, setPrice] = useState<string>('')
	const [priceUnit, setPriceUnit] = useState<string>('KG')
	const [minQuantity, setMinQuantity] = useState<string>('1')
	const [stock, setStock] = useState<string>('0')
	const [creating, setCreating] = useState<boolean>(false)

	const loadProducts = async () => {
		try {
			console.log('Loading products for shop:', shopId)
			const res = await getShopProducts(shopId)
			console.log('Products response:', res)
			setProducts(res.data.data || [])
		} catch (e) {
			console.error('Error loading products:', e)
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}

	const loadDefaultProducts = async () => {
		try {
			const res = await getDefaultProducts()
			setDefaultProducts(res.data.data || [])
		} catch (e) {
			console.error('Error loading default products:', e)
		}
	}

	useEffect(() => {
		if (shopId) {
			loadProducts()
			loadDefaultProducts()
		}
	}, [shopId])

	const onRefresh = () => {
		setRefreshing(true)
		loadProducts()
	}

	const handleSelectDefaultProduct = (defaultProduct: DefaultProduct) => {
		setSelectedDefaultProduct(defaultProduct)
		setProductName(defaultProduct.name.en) // Use English name by default
	}

	const handleCreateProduct = async () => {
		if (!productName.trim()) {
			Alert.alert('Error', 'Please enter a product name')
			return
		}

		if (!price.trim() || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
			Alert.alert('Error', 'Please enter a valid price')
			return
		}

		setCreating(true)
		try {
			const productData: CreateProductRequest = {
				name: productName.trim(),
				shopId: shopId,
				price: {
					value: {
						tnd: parseFloat(price)
					},
					unit: {
						name: priceUnit,
						min: parseInt(minQuantity) || 1
					}
				},
				photos: [],
				searchTerms: selectedDefaultProduct?.searchKeywords || [],
				stock: {
					quantity: parseInt(stock) || 0,
					minThreshold: 10
				}
			}

			if (selectedDefaultProduct) {
				productData.defaultProductId = selectedDefaultProduct._id
			}

			const response = await createProduct(productData)
			console.log('Product created:', response)

			// Refresh the products list
			await loadProducts()

			// Close modal and reset form
			setModalVisible(false)
			resetForm()

			Alert.alert('Success', 'Product created successfully!')
		} catch (error) {
			console.error('Error creating product:', error)
			Alert.alert('Error', 'Failed to create product. Please try again.')
		} finally {
			setCreating(false)
		}
	}

	const resetForm = () => {
		setSelectedDefaultProduct(null)
		setProductName('')
		setPrice('')
		setPriceUnit('KG')
		setMinQuantity('1')
		setStock('0')
	}

	if (loading) {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>Loading products...</Text>
			</View>
		)
	}

	return (
		<View style={styles.container}>
			<FlatList
				data={products}
				keyExtractor={(item) => item._id}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" colors={['#fff']} />}
				renderItem={({ item }) => (
					<View style={styles.card}>
						<Text style={styles.productName}>{item.name}</Text>
						{item.owner && <Text style={styles.meta}>Created by: {item.owner.slug}</Text>}
						<Text style={styles.meta}>Active: {item.isActive ? 'Yes' : 'No'}</Text>
						{item.availability && <Text style={styles.meta}>Available from: {new Date(item.availability.startDate).toLocaleDateString()}</Text>}
						<Text style={styles.status}>Updated: {new Date(item.updatedAt).toLocaleDateString()}</Text>
					</View>
				)}
				ListEmptyComponent={<Text style={styles.meta}>No products found for this shop.</Text>}
				contentContainerStyle={{ paddingBottom: 100 }}
			/>

			<TouchableOpacity style={styles.floatingAddButton} onPress={() => setModalVisible(true)}>
				<Text style={styles.floatingAddButtonText}>+</Text>
			</TouchableOpacity>

			<Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<ScrollView showsVerticalScrollIndicator={false}>
							<Text style={styles.modalTitle}>Create New Product</Text>

							<Text style={styles.sectionTitle}>Select Default Product (Optional)</Text>
							<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.defaultProductsContainer}>
								{defaultProducts.map((defaultProduct) => (
									<TouchableOpacity
										key={defaultProduct._id}
										style={[styles.defaultProductCard, selectedDefaultProduct?._id === defaultProduct._id && styles.selectedDefaultProduct]}
										onPress={() => handleSelectDefaultProduct(defaultProduct)}
									>
										<Text style={styles.defaultProductName}>{defaultProduct.name.en}</Text>
										<Text style={styles.defaultProductNameAr}>{defaultProduct.name.tn}</Text>
									</TouchableOpacity>
								))}
							</ScrollView>

							<Text style={styles.inputLabel}>Product Name *</Text>
							<TextInput style={styles.input} value={productName} onChangeText={setProductName} placeholder="Enter product name" placeholderTextColor="#666" />

							<Text style={styles.inputLabel}>Price (TND) *</Text>
							<TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="Enter price" placeholderTextColor="#666" keyboardType="numeric" />

							<Text style={styles.inputLabel}>Price Unit</Text>
							<View style={styles.unitContainer}>
								{['KG', 'PIECE', 'LITER', 'GRAM'].map((unit) => (
									<TouchableOpacity key={unit} style={[styles.unitButton, priceUnit === unit && styles.selectedUnit]} onPress={() => setPriceUnit(unit)}>
										<Text style={[styles.unitText, priceUnit === unit && styles.selectedUnitText]}>{unit}</Text>
									</TouchableOpacity>
								))}
							</View>

							<Text style={styles.inputLabel}>Minimum Quantity</Text>
							<TextInput style={styles.input} value={minQuantity} onChangeText={setMinQuantity} placeholder="Enter minimum quantity" placeholderTextColor="#666" keyboardType="numeric" />

							<Text style={styles.inputLabel}>Stock Quantity</Text>
							<TextInput style={styles.input} value={stock} onChangeText={setStock} placeholder="Enter stock quantity" placeholderTextColor="#666" keyboardType="numeric" />

							<View style={styles.modalButtons}>
								<TouchableOpacity
									style={[styles.modalButton, styles.cancelButton]}
									onPress={() => {
										setModalVisible(false)
										resetForm()
									}}
								>
									<Text style={styles.cancelButtonText}>Cancel</Text>
								</TouchableOpacity>

								<TouchableOpacity style={[styles.modalButton, styles.createButton]} onPress={handleCreateProduct} disabled={creating}>
									<Text style={styles.createButtonText}>{creating ? 'Creating...' : 'Create Product'}</Text>
								</TouchableOpacity>
							</View>
						</ScrollView>
					</View>
				</View>
			</Modal>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#1a1a1a'
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#fff',
		flex: 1
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
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 4
		},
		shadowOpacity: 0.3,
		shadowRadius: 4.65
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
		marginHorizontal: 20,
		borderWidth: 1,
		borderColor: '#333'
	},
	productName: {
		fontSize: 18,
		color: '#fff',
		marginBottom: 4,
		fontWeight: 'bold'
	},
	meta: {
		color: '#bbb',
		marginBottom: 4
	},
	status: {
		marginTop: 4,
		color: '#9ad36a'
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
		width: '95%',
		maxWidth: 500,
		maxHeight: '90%'
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#fff',
		marginBottom: 20,
		textAlign: 'center'
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#fff',
		marginBottom: 10,
		marginTop: 10
	},
	defaultProductsContainer: {
		marginBottom: 15
	},
	defaultProductCard: {
		backgroundColor: '#333',
		padding: 10,
		borderRadius: 8,
		marginRight: 10,
		minWidth: 120,
		borderWidth: 1,
		borderColor: '#555'
	},
	selectedDefaultProduct: {
		backgroundColor: '#007AFF',
		borderColor: '#007AFF'
	},
	defaultProductName: {
		color: '#fff',
		fontSize: 14,
		fontWeight: 'bold'
	},
	defaultProductNameAr: {
		color: '#bbb',
		fontSize: 12,
		marginTop: 2
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
	unitContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginBottom: 10
	},
	unitButton: {
		backgroundColor: '#333',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 6,
		marginRight: 8,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: '#555'
	},
	selectedUnit: {
		backgroundColor: '#007AFF',
		borderColor: '#007AFF'
	},
	unitText: {
		color: '#bbb',
		fontSize: 14
	},
	selectedUnitText: {
		color: '#fff',
		fontWeight: 'bold'
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
