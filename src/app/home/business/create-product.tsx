import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../contexts/ThemeContext'
import { createProduct, getDefaultProducts, type CreateProductRequest, type DefaultProduct } from '../../../components/products/products.api'
import { getMyShops } from '../../../components/shops/shops.api'
import { Shop } from '../../../components/shops/shops.interface'
import ScreenHeader from '../../../components/common/ScreenHeader'

export default function CreateProductScreen() {
	const router = useRouter()
	const { colors, isDark } = useTheme()

	// Form state
	const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
	const [productName, setProductName] = useState('')
	const [selectedDefaultProduct, setSelectedDefaultProduct] = useState<DefaultProduct | null>(null)
	const [priceTND, setPriceTND] = useState('')
	const [unit, setUnit] = useState('KG')
	const [minUnit, setMinUnit] = useState('1')
	const [stockQuantity, setStockQuantity] = useState('')
	const [minThreshold, setMinThreshold] = useState('5')

	// UI state
	const [creating, setCreating] = useState(false)
	const [showShops, setShowShops] = useState(false)
	const [showDefaultProducts, setShowDefaultProducts] = useState(false)
	const [shops, setShops] = useState<Shop[]>([])
	const [defaultProducts, setDefaultProducts] = useState<DefaultProduct[]>([])
	const [loadingShops, setLoadingShops] = useState(false)
	const [loadingDefaults, setLoadingDefaults] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')

	// Refs
	const priceInputRef = useRef<TextInput>(null)

	useEffect(() => {
		loadShops()
		loadDefaultProducts()
	}, [])

	const loadShops = async () => {
		try {
			setLoadingShops(true)
			const response = await getMyShops()
			setShops(response.data.docs || [])
		} catch (error) {
			console.error('Failed to load shops:', error)
		} finally {
			setLoadingShops(false)
		}
	}

	const loadDefaultProducts = async () => {
		try {
			setLoadingDefaults(true)
			const response = await getDefaultProducts(1, 100)
			setDefaultProducts(response.data.docs || [])
		} catch (error) {
			console.error('Failed to load default products:', error)
		} finally {
			setLoadingDefaults(false)
		}
	}

	const filteredDefaultProducts = defaultProducts.filter((p) => p.name.en.toLowerCase().includes(searchQuery.toLowerCase()))

	const handleSelectShop = (shop: Shop) => {
		setSelectedShop(shop)
		setShowShops(false)
	}

	const handleSelectDefaultProduct = (product: DefaultProduct) => {
		setSelectedDefaultProduct(product)
		setProductName(product.name.en)
		setShowDefaultProducts(false)
	}

	const validateForm = () => {
		if (!selectedShop) {
			Alert.alert('Validation Error', 'Please select a shop')
			return false
		}
		if (!productName.trim()) {
			Alert.alert('Validation Error', 'Please enter a product name')
			return false
		}
		if (!selectedDefaultProduct) {
			Alert.alert('Validation Error', 'Please select a product category')
			return false
		}
		const price = parseFloat(priceTND)
		if (isNaN(price) || price <= 0) {
			Alert.alert('Validation Error', 'Please enter a valid price')
			return false
		}
		const minUnitNum = parseInt(minUnit)
		if (isNaN(minUnitNum) || minUnitNum < 1) {
			Alert.alert('Validation Error', 'Minimum unit must be at least 1')
			return false
		}
		return true
	}

	const handleCreateProduct = async () => {
		if (!validateForm() || !selectedShop || !selectedDefaultProduct) return

		try {
			setCreating(true)

			const productData: CreateProductRequest = {
				shop: {
					slug: selectedShop.slug,
					_id: selectedShop._id
				},
				defaultProduct: {
					slug: selectedDefaultProduct.slug,
					_id: selectedDefaultProduct._id
				},
				name: { en: productName.trim() },
				price: {
					value: {
						tnd: parseFloat(priceTND)
					},
					unit: {
						name: unit,
						min: parseInt(minUnit)
					}
				},
				searchTerms: selectedDefaultProduct.searchKeywords,
				stock: stockQuantity
					? {
							quantity: parseInt(stockQuantity),
							minThreshold: parseInt(minThreshold)
						}
					: undefined,
				availability: {
					startDate: new Date().toISOString()
				}
			}

			await createProduct(productData)
			Alert.alert('Success', 'Product created successfully!', [
				{
					text: 'OK',
					onPress: () => router.back()
				}
			])
		} catch (error: any) {
			console.error('Failed to create product:', error)
			Alert.alert('Error', error?.response?.data?.message || 'Failed to create product. Please try again.')
		} finally {
			setCreating(false)
		}
	}

	const styles = createStyles(colors, isDark)

	return (
		<View style={styles.container}>
			<ScreenHeader title="Create Product" showBack={true} />

			<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
				<ScrollView style={styles.form} contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
					{/* Shop Selection */}
					<View style={styles.section}>
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle}>Shop</Text>
							<Text style={styles.required}>*</Text>
						</View>
						<TouchableOpacity style={[styles.selectButton, selectedShop && styles.selectButtonActive]} onPress={() => setShowShops(true)}>
							<View style={[styles.selectIcon, { backgroundColor: colors.primary + '15' }]}>
								<Text style={{ fontSize: 20 }}>{selectedShop ? '✓' : '🏪'}</Text>
							</View>
							<View style={{ flex: 1 }}>
								<Text style={[styles.selectLabel, selectedShop && { color: colors.text }]}>{selectedShop ? selectedShop.name.en : 'Select shop'}</Text>
								{selectedShop && <Text style={styles.selectSubtext}>{selectedShop.address?.city || 'No address'}</Text>}
							</View>
							<Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
						</TouchableOpacity>
					</View>

					{/* Default Product Selection */}
					<View style={styles.section}>
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle}>Product Category</Text>
							<Text style={styles.required}>*</Text>
						</View>
						<TouchableOpacity style={[styles.selectButton, selectedDefaultProduct && styles.selectButtonActive]} onPress={() => setShowDefaultProducts(true)}>
							<View style={[styles.selectIcon, { backgroundColor: colors.primary + '15' }]}>
								<Text style={{ fontSize: 20 }}>{selectedDefaultProduct ? '✓' : '📦'}</Text>
							</View>
							<View style={{ flex: 1 }}>
								<Text style={[styles.selectLabel, selectedDefaultProduct && { color: colors.text }]}>{selectedDefaultProduct ? selectedDefaultProduct.name.en : 'Select product category'}</Text>
							</View>
							<Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
						</TouchableOpacity>
					</View>

					{/* Product Name */}
					<View style={styles.section}>
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle}>Product Name</Text>
							<Text style={styles.required}>*</Text>
						</View>
						<View style={[styles.inputWrapper, { borderColor: productName ? colors.primary : colors.border }]}>
							<Ionicons name="pricetag" size={20} color={colors.textSecondary} style={{ marginRight: 12 }} />
							<TextInput
								style={[styles.input, { color: colors.text }]}
								value={productName}
								onChangeText={setProductName}
								placeholder="e.g., Fresh Atlantic Salmon"
								placeholderTextColor={colors.textSecondary}
								returnKeyType="next"
								onSubmitEditing={() => priceInputRef.current?.focus()}
							/>
						</View>
					</View>

					{/* Price & Unit */}
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Pricing</Text>
						<View style={styles.row}>
							<View style={{ flex: 1 }}>
								<Text style={styles.inputLabel}>Price (TND) *</Text>
								<View style={[styles.inputWrapper, { borderColor: priceTND ? colors.primary : colors.border }]}>
									<Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>TND</Text>
									<TextInput
										ref={priceInputRef}
										style={[styles.input, { color: colors.text, flex: 1 }]}
										value={priceTND}
										onChangeText={setPriceTND}
										placeholder="0.00"
										placeholderTextColor={colors.textSecondary}
										keyboardType="decimal-pad"
									/>
								</View>
							</View>
							<View style={{ width: 16 }} />
							<View style={{ flex: 1 }}>
								<Text style={styles.inputLabel}>Unit *</Text>
								<View style={[styles.inputWrapper, { borderColor: colors.border }]}>
									<TextInput
										style={[styles.input, { color: colors.text, textAlign: 'center' }]}
										value={unit}
										onChangeText={setUnit}
										placeholder="KG"
										placeholderTextColor={colors.textSecondary}
										autoCapitalize="characters"
									/>
								</View>
							</View>
							<View style={{ width: 16 }} />
							<View style={{ flex: 1 }}>
								<Text style={styles.inputLabel}>Min Qty *</Text>
								<View style={[styles.inputWrapper, { borderColor: colors.border }]}>
									<TextInput
										style={[styles.input, { color: colors.text, textAlign: 'center' }]}
										value={minUnit}
										onChangeText={setMinUnit}
										placeholder="1"
										placeholderTextColor={colors.textSecondary}
										keyboardType="number-pad"
									/>
								</View>
							</View>
						</View>
						<Text style={styles.hint}>
							Price per {unit || 'unit'}, minimum order: {minUnit || '1'} {unit || 'unit'}(s)
						</Text>
					</View>

					{/* Stock */}
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Inventory (Optional)</Text>
						<View style={styles.row}>
							<View style={{ flex: 1 }}>
								<Text style={styles.inputLabel}>Stock Quantity</Text>
								<View style={[styles.inputWrapper, { borderColor: colors.border }]}>
									<Ionicons name="cube" size={20} color={colors.textSecondary} style={{ marginRight: 12 }} />
									<TextInput
										style={[styles.input, { color: colors.text, flex: 1 }]}
										value={stockQuantity}
										onChangeText={setStockQuantity}
										placeholder="Available quantity"
										placeholderTextColor={colors.textSecondary}
										keyboardType="number-pad"
									/>
								</View>
							</View>
							<View style={{ width: 16 }} />
							<View style={{ flex: 1 }}>
								<Text style={styles.inputLabel}>Alert Threshold</Text>
								<View style={[styles.inputWrapper, { borderColor: colors.border }]}>
									<TextInput
										style={[styles.input, { color: colors.text, textAlign: 'center' }]}
										value={minThreshold}
										onChangeText={setMinThreshold}
										placeholder="5"
										placeholderTextColor={colors.textSecondary}
										keyboardType="number-pad"
									/>
								</View>
							</View>
						</View>
					</View>

					{/* Info Card */}
					<View style={[styles.infoCard, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
						<Text style={{ fontSize: 20, marginRight: 12 }}>💡</Text>
						<View style={{ flex: 1 }}>
							<Text style={[styles.infoTitle, { color: colors.text }]}>Quick Tip</Text>
							<Text style={[styles.infoText, { color: colors.textSecondary }]}>Select a product category to ensure your product appears in the right searches.</Text>
						</View>
					</View>
				</ScrollView>

				{/* Create Button */}
				<View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
					<TouchableOpacity
						style={[
							styles.createButton,
							{
								backgroundColor: selectedShop && productName && selectedDefaultProduct && priceTND ? colors.primary : colors.border,
								opacity: selectedShop && productName && selectedDefaultProduct && priceTND ? 1 : 0.5
							}
						]}
						onPress={handleCreateProduct}
						disabled={!selectedShop || !productName || !selectedDefaultProduct || !priceTND || creating}
					>
						{creating ? (
							<ActivityIndicator color="#fff" size="small" />
						) : (
							<>
								<Text style={styles.createButtonText}>Create Product</Text>
								<Ionicons name="checkmark-circle" size={20} color="#fff" />
							</>
						)}
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>

			{/* Shops Modal */}
			<Modal visible={showShops} animationType="slide" transparent onRequestClose={() => setShowShops(false)}>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { backgroundColor: colors.card }]}>
						<View style={styles.modalHeader}>
							<Text style={[styles.modalTitle, { color: colors.text }]}>Select Shop</Text>
							<TouchableOpacity onPress={() => setShowShops(false)}>
								<Ionicons name="close" size={24} color={colors.text} />
							</TouchableOpacity>
						</View>

						{loadingShops ? (
							<ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
						) : (
							<FlatList
								data={shops}
								keyExtractor={(item) => item._id}
								renderItem={({ item }) => (
									<TouchableOpacity style={[styles.categoryItem, { borderBottomColor: colors.border }]} onPress={() => handleSelectShop(item)}>
										<View style={{ flex: 1 }}>
											<Text style={[styles.categoryName, { color: colors.text }]}>{item.name.en}</Text>
											<Text style={[styles.categoryNameAlt, { color: colors.textSecondary }]}>{item.address?.city || 'No address'}</Text>
										</View>
										{selectedShop?._id === item._id && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
									</TouchableOpacity>
								)}
								ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textSecondary }]}>No shops found. Create a shop first.</Text>}
							/>
						)}
					</View>
				</View>
			</Modal>

			{/* Default Products Modal */}
			<Modal visible={showDefaultProducts} animationType="slide" transparent onRequestClose={() => setShowDefaultProducts(false)}>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { backgroundColor: colors.card }]}>
						<View style={styles.modalHeader}>
							<Text style={[styles.modalTitle, { color: colors.text }]}>Select Category</Text>
							<TouchableOpacity onPress={() => setShowDefaultProducts(false)}>
								<Ionicons name="close" size={24} color={colors.text} />
							</TouchableOpacity>
						</View>

						<View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
							<Ionicons name="search" size={20} color={colors.textSecondary} />
							<TextInput
								style={[styles.searchInput, { color: colors.text }]}
								value={searchQuery}
								onChangeText={setSearchQuery}
								placeholder="Search categories..."
								placeholderTextColor={colors.textSecondary}
							/>
						</View>

						{loadingDefaults ? (
							<ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
						) : (
							<FlatList
								data={filteredDefaultProducts}
								keyExtractor={(item) => item._id}
								renderItem={({ item }) => (
									<TouchableOpacity style={[styles.categoryItem, { borderBottomColor: colors.border }]} onPress={() => handleSelectDefaultProduct(item)}>
										<View style={{ flex: 1 }}>
											<Text style={[styles.categoryName, { color: colors.text }]}>{item.name.en}</Text>
										</View>
										{selectedDefaultProduct?._id === item._id && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
									</TouchableOpacity>
								)}
								ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textSecondary }]}>No categories found</Text>}
							/>
						)}
					</View>
				</View>
			</Modal>
		</View>
	)
}

const createStyles = (colors: any, isDark: boolean) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: colors.background
		},
		form: {
			flex: 1
		},
		formContent: {
			padding: 20,
			paddingBottom: 40
		},
		section: {
			marginBottom: 24
		},
		sectionHeader: {
			flexDirection: 'row',
			alignItems: 'center',
			marginBottom: 12
		},
		sectionTitle: {
			fontSize: 16,
			fontWeight: '700',
			color: colors.text
		},
		required: {
			color: '#EF4444',
			marginLeft: 4,
			fontSize: 16,
			fontWeight: '700'
		},
		selectButton: {
			flexDirection: 'row',
			alignItems: 'center',
			padding: 16,
			borderRadius: 12,
			borderWidth: 2,
			borderColor: colors.border,
			backgroundColor: colors.background
		},
		selectButtonActive: {
			borderColor: colors.primary,
			backgroundColor: colors.primary + '05'
		},
		selectIcon: {
			width: 48,
			height: 48,
			borderRadius: 12,
			justifyContent: 'center',
			alignItems: 'center',
			marginRight: 16
		},
		selectLabel: {
			fontSize: 16,
			fontWeight: '600',
			color: colors.textSecondary
		},
		selectSubtext: {
			fontSize: 13,
			color: colors.textTertiary,
			marginTop: 2
		},
		inputWrapper: {
			flexDirection: 'row',
			alignItems: 'center',
			borderWidth: 2,
			borderRadius: 12,
			paddingHorizontal: 16,
			paddingVertical: 12,
			backgroundColor: colors.background
		},
		input: {
			fontSize: 16,
			flex: 1
		},
		inputLabel: {
			fontSize: 14,
			fontWeight: '600',
			color: colors.textSecondary,
			marginBottom: 8
		},
		currencySymbol: {
			fontSize: 16,
			fontWeight: '600',
			marginRight: 8
		},
		row: {
			flexDirection: 'row',
			alignItems: 'flex-end'
		},
		hint: {
			fontSize: 12,
			color: colors.textTertiary,
			marginTop: 8,
			fontStyle: 'italic'
		},
		infoCard: {
			flexDirection: 'row',
			padding: 16,
			borderRadius: 12,
			borderWidth: 1,
			marginTop: 8
		},
		infoTitle: {
			fontSize: 14,
			fontWeight: '600',
			marginBottom: 4
		},
		infoText: {
			fontSize: 13,
			lineHeight: 18
		},
		footer: {
			padding: 20,
			borderTopWidth: 1
		},
		createButton: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: 8,
			paddingVertical: 16,
			borderRadius: 12,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.2,
			shadowRadius: 8,
			elevation: 4
		},
		createButtonText: {
			color: '#fff',
			fontSize: 17,
			fontWeight: '700'
		},
		modalOverlay: {
			flex: 1,
			backgroundColor: 'rgba(0, 0, 0, 0.6)',
			justifyContent: 'flex-end'
		},
		modalContent: {
			maxHeight: '80%',
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			paddingBottom: 20
		},
		modalHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			padding: 20,
			borderBottomWidth: 1,
			borderBottomColor: 'rgba(0,0,0,0.05)'
		},
		modalTitle: {
			fontSize: 20,
			fontWeight: '700'
		},
		searchBar: {
			flexDirection: 'row',
			alignItems: 'center',
			margin: 20,
			marginBottom: 12,
			paddingHorizontal: 16,
			paddingVertical: 12,
			borderRadius: 12,
			borderWidth: 1
		},
		searchInput: {
			flex: 1,
			fontSize: 16,
			marginLeft: 12
		},
		categoryItem: {
			flexDirection: 'row',
			alignItems: 'center',
			padding: 16,
			paddingHorizontal: 20,
			borderBottomWidth: 1
		},
		categoryName: {
			fontSize: 16,
			fontWeight: '600',
			marginBottom: 4
		},
		categoryNameAlt: {
			fontSize: 14
		},
		emptyText: {
			textAlign: 'center',
			fontSize: 16,
			marginTop: 40,
			paddingHorizontal: 20
		}
	})
