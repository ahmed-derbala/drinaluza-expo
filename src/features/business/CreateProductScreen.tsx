import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { useTheme } from '@/core/contexts/ThemeContext'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import { createProduct, getDefaultProducts, type CreateProductRequest, type DefaultProduct } from '@/features/products/products.api'
import { getMyBusinesses } from '@/features/businesses/businesses.api'
import { Business } from '@/features/businesses/businesses.interface'
import ScreenHeader from '@/features/common/ScreenHeader'
import SmartImage from '@/core/helpers/SmartImage'
import { uploadFile } from '@/core/fileHandler'
import { showAlert } from '@/core/helpers/popup'

export default function CreateProductScreen() {
	const router = useRouter()
	const { businessId, businessSlug } = useLocalSearchParams<{ businessId?: string; businessSlug?: string }>()
	const { colors } = useTheme()

	// Form state
	const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
	const [productNameEn, setProductNameEn] = useState('')
	const [productNameTnLatn, setProductNameTnLatn] = useState('')
	const [productNameTnArab, setProductNameTnArab] = useState('')
	const [selectedDefaultProduct, setSelectedDefaultProduct] = useState<DefaultProduct | null>(null)
	const [priceTND, setPriceTND] = useState('10')
	const [unit, setUnit] = useState('kg')
	const [minUnit, setMinUnit] = useState('1')
	const [maxUnit, setMaxUnit] = useState('10')
	const [stockQuantity, setStockQuantity] = useState('')
	const [minThreshold, setMinThreshold] = useState('5')
	const [productPhoto, setProductPhoto] = useState<string | null>(null)

	// UI state
	const [creating, setCreating] = useState(false)
	const [uploadingPhoto, setUploadingPhoto] = useState(false)
	const [showBusinesses, setShowBusinesses] = useState(false)
	const [showDefaultProducts, setShowDefaultProducts] = useState(false)
	const [businesses, setBusinesss] = useState<Business[]>([])
	const [defaultProducts, setDefaultProducts] = useState<DefaultProduct[]>([])
	const [loadingBusinesses, setLoadingBusinesses] = useState(false)
	const [loadingDefaults, setLoadingDefaults] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const [showUnitPicker, setShowUnitPicker] = useState(false)

	// Refs
	const priceInputRef = useRef<TextInput>(null)

	const COMMON_UNITS = ['kg', 'l', 'piece', 'tara']
	const UNIT_LABELS: { [key: string]: string } = {
		KG: 'Kilogram',
		Gram: 'Gram',
		L: 'Liter',
		ML: 'Milliliter',
		Piece: 'Individual Item',
		Pack: 'Package',
		Bottle: 'Bottle',
		Box: 'Box',
		Dozen: '12 Items'
	}

	useEffect(() => {
		loadBusinesses()
		loadDefaultProducts()
	}, [])

	// Auto-select business if navigated from business details page
	useEffect(() => {
		if ((businessId || businessSlug) && businesses.length > 0 && !selectedBusiness) {
			const matchedBusiness = businesses.find((s) => s._id === businessId || s.slug === businessSlug)
			if (matchedBusiness) {
				setSelectedBusiness(matchedBusiness)
			}
		}
	}, [businessId, businessSlug, businesses, selectedBusiness])

	const loadBusinesses = async () => {
		try {
			setLoadingBusinesses(true)
			const response = await getMyBusinesses()
			setBusinesss(response.data.docs || [])
		} catch (error) {
			console.error('Failed to load businesses:', error)
		} finally {
			setLoadingBusinesses(false)
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

	const handleSelectBusiness = (business: Business) => {
		setSelectedBusiness(business)
		setShowBusinesses(false)
	}

	const handleSelectDefaultProduct = (product: DefaultProduct) => {
		setSelectedDefaultProduct(product)
		setProductNameEn(product.name.en)
		setProductNameTnLatn(product.name.tn_latn || '')
		setProductNameTnArab(product.name.tn_arab || '')
		setShowDefaultProducts(false)
	}

	const handleUnitSelect = (selectedMeasure: string) => {
		setUnit(selectedMeasure)
		setShowUnitPicker(false)

		// Set default min/max values based on measure
		switch (selectedMeasure.toLowerCase()) {
			case 'kg':
			case 'l':
				setMinUnit('0.01')
				setMaxUnit('10')
				break
			case 'piece':
			case 'tara':
				setMinUnit('1')
				setMaxUnit('10')
				break
			default:
				// Keep current values or set base defaults
				break
		}
	}

	const validateForm = () => {
		if (!selectedBusiness) {
			showAlert('Validation Error', 'Please select a business')
			return false
		}
		if (!productNameEn.trim()) {
			showAlert('Validation Error', 'Please enter a product name (English)')
			return false
		}
		if (!selectedDefaultProduct) {
			showAlert('Validation Error', 'Please select a default product')
			return false
		}
		const price = parseFloat(priceTND)
		if (isNaN(price) || price <= 0) {
			showAlert('Validation Error', 'Please enter a valid price')
			return false
		}
		const minUnitNum = parseFloat(minUnit)
		if (isNaN(minUnitNum) || minUnitNum <= 0) {
			showAlert('Validation Error', 'Minimum unit must be greater than 0')
			return false
		}
		const maxUnitNum = parseFloat(maxUnit)
		if (isNaN(maxUnitNum) || maxUnitNum <= 0) {
			showAlert('Validation Error', 'Maximum unit must be greater than 0')
			return false
		}
		if (maxUnitNum < minUnitNum) {
			showAlert('Validation Error', 'Maximum unit cannot be less than minimum unit')
			return false
		}
		return true
	}

	const handleUploadPhoto = async () => {
		try {
			let DocumentPicker: any
			try {
				DocumentPicker = require('expo-document-picker')
			} catch (e) {
				console.error('expo-document-picker not installed:', e)
				showAlert('Error', 'expo-document-picker is not installed.')
				return
			}

			const result = await DocumentPicker.getDocumentAsync({
				type: ['image/*'],
				copyToCacheDirectory: true
			})

			if (result.canceled) return

			const file = result.assets[0]
			if (!file) return

			setUploadingPhoto(true)

			const uploadResult = await uploadFile({
				uri: file.uri,
				name: file.name,
				type: file.mimeType || 'image/jpeg',
				fileType: 'image',
				fileObj: file
			})

			if (uploadResult.success && uploadResult.file?.url) {
				setProductPhoto(uploadResult.file.url)
				showAlert('Success', 'Photo uploaded successfully!')
			} else if (uploadResult.success && uploadResult.fileUrl) {
				setProductPhoto(uploadResult.fileUrl)
				showAlert('Success', 'Photo uploaded successfully!')
			} else {
				showAlert('Error', uploadResult.error || 'Failed to upload photo')
			}
		} catch (error: any) {
			console.error('Error uploading photo:', error)
			showAlert('Error', error.message || 'Failed to upload photo')
		} finally {
			setUploadingPhoto(false)
		}
	}

	const handleCreateProduct = async () => {
		if (!validateForm() || !selectedBusiness || !selectedDefaultProduct) return

		try {
			setCreating(true)

			const productData: CreateProductRequest = {
				business: {
					slug: selectedBusiness.slug,
					_id: selectedBusiness._id
				},
				defaultProduct: {
					slug: selectedDefaultProduct.slug,
					_id: selectedDefaultProduct._id
				},
				name: {
					en: productNameEn.trim(),
					tn_latn: productNameTnLatn.trim() || undefined,
					tn_arab: productNameTnArab.trim() || undefined
				},
				price: {
					total: {
						tnd: parseFloat(priceTND),
						eur: null,
						usd: null
					}
				},
				unit: {
					measure: unit,
					min: parseFloat(minUnit),
					max: parseFloat(maxUnit)
				},
				searchTerms: selectedDefaultProduct.searchKeywords,
				stock: stockQuantity
					? {
							quantity: parseInt(stockQuantity),
							minThreshold: parseInt(minThreshold)
						}
					: undefined,
				availability: {
					startDate: new Date().toISOString(),
					endDate: null
				},
				media: productPhoto ? { thumbnail: { url: productPhoto } } : undefined,
				photos: productPhoto ? [productPhoto] : undefined
			}

			await createProduct(productData)
			showAlert('Success', 'Product created successfully!', () => {
				router.replace(`/(home)/businesses/${selectedBusiness.slug}/products` as never)
			})
		} catch (error: any) {
			console.error('Failed to create product:', error)
			showAlert('Error', error?.response?.data?.message || 'Failed to create product. Please try again.')
		} finally {
			setCreating(false)
		}
	}

	const styles = createStyles(colors)
	const { onScroll } = useScrollHandler()

	return (
		<View style={styles.container}>
			<ScreenHeader title="Create Product" showBack={true} />

			<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
				<ScrollView style={styles.form} contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
					{/* Business Selection */}
					<View style={styles.section}>
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle}>Business</Text>
							<Text style={styles.required}>*</Text>
						</View>
						<TouchableOpacity style={[styles.selectButton, selectedBusiness && styles.selectButtonActive]} onPress={() => setShowBusinesses(true)}>
							<View style={[styles.selectIcon, { backgroundColor: colors.primary + '15' }]}>
								<Text style={{ fontSize: 20 }}>{selectedBusiness ? '✓' : '🏪'}</Text>
							</View>
							<View style={{ flex: 1 }}>
								<Text style={[styles.selectLabel, selectedBusiness && { color: colors.text }]}>{selectedBusiness ? selectedBusiness.name.en : 'Select business'}</Text>
								{selectedBusiness && <Text style={styles.selectSubtext}>{selectedBusiness.address?.city || 'No address'}</Text>}
							</View>
							<Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
						</TouchableOpacity>
					</View>

					{/* Default Product Selection */}
					<View style={styles.section}>
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle}>Default Product</Text>
							<Text style={styles.required}>*</Text>
						</View>
						<TouchableOpacity style={[styles.selectButton, selectedDefaultProduct && styles.selectButtonActive]} onPress={() => setShowDefaultProducts(true)}>
							<View style={[styles.selectIcon, { backgroundColor: colors.primary + '15', overflow: 'hidden' }]}>
								<SmartImage source={selectedDefaultProduct?.media?.thumbnail?.url} style={{ width: '100%', height: '100%' }} resizeMode="cover" entityType="product" />
							</View>
							<View style={{ flex: 1 }}>
								<Text style={[styles.selectLabel, selectedDefaultProduct && { color: colors.text }]}>{selectedDefaultProduct ? selectedDefaultProduct.name.en : 'Select default product'}</Text>
							</View>
							<Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
						</TouchableOpacity>
					</View>

					{/* Product Photo Selection */}
					<View style={styles.section}>
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle}>Product Photo</Text>
							<Text style={[styles.optional, { color: colors.textSecondary }]}>Optional</Text>
						</View>
						<Text style={[styles.hint, { marginTop: 0, marginBottom: 16 }]}>Upload a custom photo or leave empty to use the default product image.</Text>

						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
							<View style={[styles.photoUploadContainer, { borderColor: productPhoto ? colors.primary : colors.border, backgroundColor: colors.primary + '05' }]}>
								{productPhoto ? (
									<SmartImage source={productPhoto} style={styles.uploadedPhoto} resizeMode="cover" entityType="product" />
								) : (
									<Ionicons name="camera-outline" size={32} color={colors.textTertiary} />
								)}
							</View>
							<TouchableOpacity style={[styles.uploadButton, { backgroundColor: colors.primary }]} onPress={handleUploadPhoto} disabled={uploadingPhoto}>
								{uploadingPhoto ? (
									<ActivityIndicator size="small" color="#fff" />
								) : (
									<>
										<Ionicons name="cloud-upload-outline" size={20} color="#fff" />
										<Text style={styles.uploadButtonText}>{productPhoto ? 'Change Photo' : 'Upload Photo'}</Text>
									</>
								)}
							</TouchableOpacity>
						</View>
					</View>

					{/* Product Names */}
					<View style={styles.section}>
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle}>Product Names</Text>
							<Text style={styles.required}>*</Text>
						</View>

						{/* EN Name */}
						<View style={styles.inputLabelRow}>
							<Text style={[styles.inputLabel, { color: colors.text }]}>English Name</Text>
							<Text style={[styles.required, { color: '#EF4444' }]}>*</Text>
						</View>
						<View style={[styles.inputWrapper, { borderColor: productNameEn ? colors.primary : colors.border, marginBottom: 16 }]}>
							<View style={[styles.inputIcon, { backgroundColor: colors.primary + '10' }]}>
								<Text style={{ fontSize: 16 }}>🇺🇸</Text>
							</View>
							<TextInput
								style={[styles.input, { color: colors.text }]}
								value={productNameEn}
								onChangeText={setProductNameEn}
								placeholder="e.g., Fresh Atlantic Salmon"
								placeholderTextColor={colors.textSecondary}
								returnKeyType="next"
							/>
						</View>

						{/* TN Latin Name */}
						<View style={styles.inputLabelRow}>
							<Text style={[styles.inputLabel, { color: colors.text }]}>Tunisian Name (Latin)</Text>
							<Text style={[styles.optional, { color: colors.textSecondary }]}>Optional</Text>
						</View>
						<View style={[styles.inputWrapper, { borderColor: productNameTnLatn ? colors.primary : colors.border, marginBottom: 16 }]}>
							<View style={[styles.inputIcon, { backgroundColor: colors.primary + '10' }]}>
								<View style={{ flexDirection: 'row', alignItems: 'center' }}>
									<Text style={{ fontSize: 14 }}>🇹🇳</Text>
									<Text style={{ fontSize: 10, marginLeft: 2, fontWeight: '700' }}>A</Text>
								</View>
							</View>
							<TextInput
								style={[styles.input, { color: colors.text }]}
								value={productNameTnLatn}
								onChangeText={setProductNameTnLatn}
								placeholder="e.g., Salmon Fresh"
								placeholderTextColor={colors.textSecondary}
								returnKeyType="next"
							/>
						</View>

						{/* TN Arabic Name */}
						<View style={styles.inputLabelRow}>
							<Text style={[styles.inputLabel, { color: colors.text }]}>Tunisian Name (Arabic)</Text>
							<Text style={[styles.optional, { color: colors.textSecondary }]}>Optional</Text>
						</View>
						<View style={[styles.inputWrapper, { borderColor: productNameTnArab ? colors.primary : colors.border }]}>
							<View style={[styles.inputIcon, { backgroundColor: colors.primary + '10' }]}>
								<View style={{ flexDirection: 'row', alignItems: 'center' }}>
									<Text style={{ fontSize: 14 }}>🇹🇳</Text>
									<Text style={{ fontSize: 10, marginLeft: 2, fontWeight: '700' }}>ع</Text>
								</View>
							</View>
							<TextInput
								style={[styles.input, { color: colors.text, textAlign: 'right' }]}
								value={productNameTnArab}
								onChangeText={setProductNameTnArab}
								placeholder="مثلا: سالمون طازج"
								placeholderTextColor={colors.textSecondary}
								returnKeyType="next"
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
								<TouchableOpacity style={[styles.inputWrapper, { borderColor: colors.border }]} onPress={() => setShowUnitPicker(true)}>
									<Text style={{ color: colors.text, flex: 1, fontSize: 16 }}>{unit || 'Select unit'}</Text>
									<Ionicons name="caret-down" size={16} color={colors.textSecondary} />
								</TouchableOpacity>
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
										keyboardType="decimal-pad"
									/>
								</View>
							</View>
							<View style={{ width: 16 }} />
							<View style={{ flex: 1 }}>
								<Text style={styles.inputLabel}>Max Qty *</Text>
								<View style={[styles.inputWrapper, { borderColor: colors.border }]}>
									<TextInput
										style={[styles.input, { color: colors.text, textAlign: 'center' }]}
										value={maxUnit}
										onChangeText={setMaxUnit}
										placeholder="10"
										placeholderTextColor={colors.textSecondary}
										keyboardType="decimal-pad"
									/>
								</View>
							</View>
						</View>
						<Text style={styles.hint}>
							Price per {unit || 'unit'}, range: {minUnit || '0'} - {maxUnit || '0'} {unit || 'unit'}(s)
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
							<Text style={[styles.infoText, { color: colors.textSecondary }]}>Select a default product to ensure your product appears in the right searches.</Text>
						</View>
					</View>
				</ScrollView>

				{/* Create Button */}
				<View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
					<TouchableOpacity
						style={[
							styles.createButton,
							{
								backgroundColor: selectedBusiness && productNameEn && selectedDefaultProduct && priceTND ? colors.primary : colors.border,
								opacity: selectedBusiness && productNameEn && selectedDefaultProduct && priceTND ? 1 : 0.5
							}
						]}
						onPress={handleCreateProduct}
						disabled={!selectedBusiness || !productNameEn || !selectedDefaultProduct || !priceTND || creating}
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

			{/* Businesses Modal */}
			<Modal visible={showBusinesses} animationType="slide" transparent onRequestClose={() => setShowBusinesses(false)}>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { backgroundColor: colors.card }]}>
						<View style={styles.modalHeader}>
							<Text style={[styles.modalTitle, { color: colors.text }]}>Select Business</Text>
							<TouchableOpacity onPress={() => setShowBusinesses(false)}>
								<Ionicons name="close" size={24} color={colors.text} />
							</TouchableOpacity>
						</View>

						{loadingBusinesses ? (
							<ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
						) : (
							<FlatList
								data={businesses}
								keyExtractor={(item) => item._id}
								renderItem={({ item }) => (
									<TouchableOpacity style={[styles.categoryItem, { borderBottomColor: colors.border }]} onPress={() => handleSelectBusiness(item)}>
										<View style={{ flex: 1 }}>
											<Text style={[styles.categoryName, { color: colors.text }]}>{item.name.en}</Text>
											<Text style={[styles.categoryNameAlt, { color: colors.textSecondary }]}>{item.address?.city || 'No address'}</Text>
										</View>
										{selectedBusiness?._id === item._id && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
									</TouchableOpacity>
								)}
								ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textSecondary }]}>No businesses found. Create a business first.</Text>}
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
							<Text style={[styles.modalTitle, { color: colors.text }]}>Select Default Product</Text>
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
								placeholder="Search products..."
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
										<View style={styles.categoryImageContainer}>
											<SmartImage source={item.media?.thumbnail?.url} style={styles.categoryThumbnail} resizeMode="cover" entityType="product" />
										</View>
										<View style={{ flex: 1 }}>
											<Text style={[styles.categoryName, { color: colors.text }]}>{item.name.en}</Text>
											{item.searchKeywords && item.searchKeywords.length > 0 && (
												<Text style={[styles.categoryKeywords, { color: colors.textSecondary }]} numberOfLines={1}>
													{item.searchKeywords.join(', ')}
												</Text>
											)}
										</View>
										{selectedDefaultProduct?._id === item._id && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
									</TouchableOpacity>
								)}
								ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textSecondary }]}>No products found</Text>}
							/>
						)}
					</View>
				</View>
			</Modal>

			{/* Unit Picker Modal */}
			<Modal visible={showUnitPicker} animationType="slide" transparent onRequestClose={() => setShowUnitPicker(false)}>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { backgroundColor: colors.card, maxHeight: '60%' }]}>
						<View style={styles.modalHeader}>
							<Text style={[styles.modalTitle, { color: colors.text }]}>Select Unit</Text>
							<TouchableOpacity onPress={() => setShowUnitPicker(false)}>
								<Ionicons name="close" size={24} color={colors.text} />
							</TouchableOpacity>
						</View>
						<FlatList
							data={COMMON_UNITS}
							keyExtractor={(item) => item}
							renderItem={({ item }) => (
								<TouchableOpacity style={[styles.categoryItem, { borderBottomColor: colors.border }]} onPress={() => handleUnitSelect(item)}>
									<View style={{ flex: 1 }}>
										<Text style={[styles.categoryName, { color: colors.text }]}>{item}</Text>
										<Text style={[styles.categoryNameAlt, { color: colors.textSecondary }]}>{UNIT_LABELS[item]}</Text>
									</View>
									{unit === item && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
								</TouchableOpacity>
							)}
						/>
						{/* Custom unit option */}
						<View style={{ padding: 20 }}>
							<Text style={[styles.inputLabel, { marginBottom: 12 }]}>Or enter custom unit:</Text>
							<View style={[styles.inputWrapper, { borderColor: colors.border }]}>
								<TextInput
									style={[styles.input, { color: colors.text }]}
									placeholder="e.g., Bag, Tray"
									placeholderTextColor={colors.textSecondary}
									onChangeText={setUnit}
									value={COMMON_UNITS.includes(unit) ? '' : unit}
									autoCapitalize="words"
								/>
								<TouchableOpacity onPress={() => setShowUnitPicker(false)} style={{ backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 8 }}>
									<Text style={{ color: '#fff', fontWeight: '700' }}>Apply</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	)
}

const createStyles = (colors: any) =>
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
		categoryImageContainer: {
			marginRight: 16
		},
		categoryThumbnail: {
			width: 50,
			height: 50,
			borderRadius: 8
		},
		categoryKeywords: {
			fontSize: 12,
			marginTop: 2
		},
		inputLabelRow: {
			flexDirection: 'row',
			alignItems: 'center',
			marginBottom: 8
		},
		inputIcon: {
			width: 32,
			height: 32,
			borderRadius: 8,
			justifyContent: 'center',
			alignItems: 'center',
			marginRight: 10
		},
		optional: {
			marginLeft: 4,
			fontSize: 12,
			fontWeight: '500'
		},
		emptyText: {
			textAlign: 'center',
			fontSize: 16,
			marginTop: 40,
			paddingHorizontal: 20
		},
		photoUploadContainer: {
			width: 80,
			height: 80,
			borderRadius: 12,
			borderWidth: 2,
			borderStyle: 'dashed',
			justifyContent: 'center',
			alignItems: 'center',
			overflow: 'hidden'
		},
		uploadedPhoto: {
			width: '100%',
			height: '100%'
		},
		uploadButton: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingHorizontal: 16,
			paddingVertical: 12,
			borderRadius: 10,
			gap: 8
		},
		uploadButtonText: {
			color: '#fff',
			fontWeight: '600',
			fontSize: 14
		}
	})
