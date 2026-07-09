import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Platform, Modal, FlatList, ScrollView, KeyboardAvoidingView } from 'react-native'

import { useRouter, useLocalSearchParams, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, createShadow } from '@/core/theme'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import { createProduct, getDefaultProducts, type CreateProductRequest, type DefaultProduct } from '@/features/products/products.api'
import { getCaliberLabel } from '@/features/products/products.helpers'
import { FileRef } from '@/features/products/products.type'
import { getMyBusinesses } from '@/features/businesses/businesses.api'
import { Business } from '@/features/businesses/businesses.interface'
import SmartImage from '@/core/SmartImageViewer'
import { uploadFile } from '@/core/file'
import { showAlert } from '@/core/helpers/popup'
import { translate } from '@/core/translation'
import LocalizedFormInput from '@/features/common/LocalizedFormInput'
import SearchableModalPicker from '@/features/common/SearchableModalPicker'
import { SmartHeader } from '@/core/smart-header'
import KeyboardAvoidingWrapper from '@/core/keyboard-avoiding-wrapper/KeyboardAvoidingWrapper'

export default function CreateProductScreen() {
	const router = useRouter()
	const { businessId, businessSlug, source } = useLocalSearchParams<{ businessId?: string; businessSlug?: string; source?: string }>()
	const { colors } = useTheme()
	const styles = createStyles(colors)
	const { onScroll } = useScrollHandler()

	// Form state
	const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
	const [productNameEn, setProductNameEn] = useState('')
	const [productNameTnLatn, setProductNameTnLatn] = useState('')
	const [productNameTnArab, setProductNameTnArab] = useState('')
	const [selectedDefaultProduct, setSelectedDefaultProduct] = useState<DefaultProduct | null>(null)

	// Pricing
	const [priceTND, setPriceTND] = useState('10')
	const [unit, setUnit] = useState('kg')
	const [minUnit, setMinUnit] = useState('1')
	const [maxUnit, setMaxUnit] = useState('10')
	const [unitStep, setUnitStep] = useState('1')

	// Inventory
	const [stockQuantity, setStockQuantity] = useState('100')
	const [minThreshold, setMinThreshold] = useState('10')
	const [uploadedGallery, setUploadedGallery] = useState<FileRef[]>([])

	// Specs state (with default values populated)
	const [caliber, setCaliber] = useState<1 | 2 | 3 | 4 | 5>(3)
	const [originStreet, setOriginStreet] = useState('')
	const [originCity, setOriginCity] = useState('Ellouza')
	const [originRegion, setOriginRegion] = useState('Sfax')
	const [originPostalCode, setOriginPostalCode] = useState('3016')
	const [originCountry, setOriginCountry] = useState('Tunisia')

	// UI state
	const [creating, setCreating] = useState(false)
	const [uploadingPhoto, setUploadingPhoto] = useState(false)

	// Modals
	const [showBusinesses, setShowBusinesses] = useState(false)
	const [showDefaultProducts, setShowDefaultProducts] = useState(false)
	const [showUnitPicker, setShowUnitPicker] = useState(false)

	// Data
	const [businesses, setBusinesss] = useState<Business[]>([])
	const [defaultProducts, setDefaultProducts] = useState<DefaultProduct[]>([])
	const [loadingBusinesses, setLoadingBusinesses] = useState(false)
	const [loadingDefaults, setLoadingDefaults] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')

	// Refs
	const priceInputRef = useRef<TextInput>(null)

	const COMMON_UNITS = ['kg', 'l', 'piece', 'tara']
	const UNIT_LABELS: { [key: string]: string } = {
		kg: translate('unit_kg', 'Kilogram'),
		l: translate('unit_l', 'Liter'),
		piece: translate('unit_piece', 'Individual Item'),
		tara: translate('unit_tara', 'Tara (Crate)')
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

	const filteredDefaultProducts = defaultProducts.filter((p) => (p.name?.en || '').toLowerCase().includes(searchQuery.toLowerCase()))

	const handleSelectBusiness = (business: Business) => {
		setSelectedBusiness(business)
		setShowBusinesses(false)
	}

	const handleSelectDefaultProduct = (product: DefaultProduct) => {
		setSelectedDefaultProduct(product)
		setProductNameEn(product.name?.en || '')
		setProductNameTnLatn(product.name?.tn_latn || '')
		setProductNameTnArab(product.name?.tn_arab || '')
		setShowDefaultProducts(false)
	}

	const handleUnitSelect = (selectedMeasure: string) => {
		setUnit(selectedMeasure)
		setShowUnitPicker(false)

		switch (selectedMeasure.toLowerCase()) {
			case 'kg':
			case 'l':
				setMinUnit('0.01')
				setMaxUnit('10')
				setUnitStep('0.5')
				break
			case 'piece':
			case 'tara':
				setMinUnit('1')
				setMaxUnit('10')
				setUnitStep('1')
				break
			default:
				break
		}
	}

	const validateForm = () => {
		if (!selectedBusiness) {
			showAlert(translate('validation_error', 'Validation Error'), translate('err_select_business', 'Please select a business'))
			return false
		}
		if (!productNameEn.trim()) {
			showAlert(translate('validation_error', 'Validation Error'), translate('err_enter_product_name', 'Please enter a product name (English)'))
			return false
		}
		if (!selectedDefaultProduct) {
			showAlert(translate('validation_error', 'Validation Error'), translate('err_select_default_product', 'Please select a default product'))
			return false
		}
		const price = parseFloat(priceTND)
		if (isNaN(price) || price <= 0) {
			showAlert(translate('validation_error', 'Validation Error'), translate('err_valid_price', 'Please enter a valid price'))
			return false
		}
		const minUnitNum = parseFloat(minUnit)
		if (isNaN(minUnitNum) || minUnitNum <= 0) {
			showAlert(translate('validation_error', 'Validation Error'), translate('err_min_unit', 'Minimum unit must be greater than 0'))
			return false
		}
		const maxUnitNum = parseFloat(maxUnit)
		if (isNaN(maxUnitNum) || maxUnitNum <= 0) {
			showAlert(translate('validation_error', 'Validation Error'), translate('err_max_unit', 'Maximum unit must be greater than 0'))
			return false
		}
		if (maxUnitNum < minUnitNum) {
			showAlert(translate('validation_error', 'Validation Error'), translate('err_max_min', 'Maximum unit cannot be less than minimum unit'))
			return false
		}
		const stepUnitNum = parseFloat(unitStep)
		if (isNaN(stepUnitNum) || stepUnitNum <= 0) {
			showAlert(translate('validation_error', 'Validation Error'), translate('err_unit_step', 'Unit step must be greater than 0'))
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
				showAlert(translate('error', 'Error'), translate('err_no_doc_picker', 'Document picker is not available.'))
				return
			}

			const remainingSlots = 5 - uploadedGallery.length
			if (remainingSlots <= 0) {
				showAlert(translate('limit_reached', 'Limit Reached'), translate('err_max_photos', 'You can upload up to 5 photos.'))
				return
			}

			const result = await DocumentPicker.getDocumentAsync({
				type: ['image/*'],
				copyToCacheDirectory: true,
				multiple: true
			})

			if (result.canceled) return

			const assets = result.assets || []
			if (assets.length === 0) return

			let filesToUpload = assets.slice(0, remainingSlots)
			if (assets.length > remainingSlots) {
				showAlert(translate('limit_notice', 'Limit Notice'), translate('err_max_photos_selected', 'Only the first {remaining} photos will be uploaded.').replace('{remaining}', String(remainingSlots)))
			}

			setUploadingPhoto(true)

			const uploadedFiles: FileRef[] = []

			for (const file of filesToUpload) {
				const uploadResult = await uploadFile({
					uri: file.uri,
					name: file.name,
					type: file.mimeType || 'image/jpeg',
					fileType: 'image',
					fileObj: file
				})

				if (uploadResult.success && (uploadResult.file || uploadResult.fileUrl)) {
					const fileData = uploadResult.file
					const newFile: FileRef = {
						_id: uploadResult.fileId || fileData?._id || '',
						name: fileData?.name || file.name,
						extension: fileData?.extension || file.name.substring(file.name.lastIndexOf('.')),
						url: uploadResult.fileUrl || fileData?.url || '',
						encoding: fileData?.encoding,
						mimetype: fileData?.mimetype || file.mimeType || 'image/jpeg',
						size: fileData?.size || file.size,
						updatedAt: fileData?.updatedAt || new Date().toISOString(),
						createdAt: fileData?.createdAt || new Date().toISOString()
					}
					uploadedFiles.push(newFile)
				} else {
					showAlert(translate('error', 'Error'), (uploadResult.error || translate('upload_failed', 'Failed to upload photo')) + `: ${file.name}`)
				}
			}

			if (uploadedFiles.length > 0) {
				setUploadedGallery((prev) => [...prev, ...uploadedFiles])
				showAlert(translate('success', 'Success'), translate('photo_uploaded', 'Photos uploaded successfully!'))
			}
		} catch (error: any) {
			console.error('Error uploading photo:', error)
			showAlert(translate('error', 'Error'), error.message || translate('upload_failed', 'Failed to upload photo'))
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
					max: parseFloat(maxUnit),
					step: parseFloat(unitStep)
				},
				searchKeywords: selectedDefaultProduct.searchKeywords,
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
				media: {
					thumbnail: uploadedGallery.length > 0 ? { url: uploadedGallery[0].url } : undefined,
					gallery: uploadedGallery.length > 0 ? uploadedGallery : undefined
				},
				specs: {
					caliber: caliber,
					origin: {
						street: originStreet.trim() || undefined,
						city: originCity.trim() || undefined,
						region: originRegion.trim() || undefined,
						postalCode: originPostalCode.trim() || undefined,
						country: originCountry.trim() || undefined
					}
				}
			}

			await createProduct(productData)
			showAlert(translate('success', 'Success'), translate('product_created_success', 'Product created successfully!'), () => {
				router.replace(`/dashboard/${selectedBusiness.slug}/products` as never)
			})
		} catch (error: any) {
			console.error('Failed to create product:', error)
			showAlert(translate('error', 'Error'), error?.response?.data?.message || translate('err_create_failed', 'Failed to create product. Please try again.'))
		} finally {
			setCreating(false)
		}
	}

	const isFormValid = selectedBusiness && productNameEn && selectedDefaultProduct && priceTND

	const handleBack = () => {
		if (router.canGoBack()) {
			router.back()
		} else {
			if (businessSlug || selectedBusiness?.slug) {
				router.replace(`/dashboard/${businessSlug || selectedBusiness?.slug}/products` as never)
			} else {
				router.replace('/(home)/dashboard' as never)
			}
		}
	}

	return (
		<View style={styles.container}>
			<Stack.Screen options={{ title: translate('create_product', 'Create Product') }} />

			<KeyboardAvoidingWrapper
				style={styles.form}
				contentContainerStyle={styles.formContent}
				scrollViewProps={{
					onScroll: onScroll,
					scrollEventThrottle: 16
				}}
			>
				{/* GENERAL INFO CARD */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>{translate('general_info', 'General Info')}</Text>

					<View style={styles.fieldContainer}>
						<Text style={styles.fieldLabel}>
							{translate('business', 'Business')} <Text style={styles.required}>*</Text>
						</Text>
						<TouchableOpacity style={[styles.pickerButton, selectedBusiness && styles.pickerButtonActive]} onPress={() => setShowBusinesses(true)}>
							<View style={[styles.pickerIcon, { backgroundColor: colors.primary + '15' }]}>
								<Text style={{ fontSize: 18 }}>{selectedBusiness ? '🏪' : '🏢'}</Text>
							</View>
							<View style={{ flex: 1 }}>
								<Text style={[styles.pickerText, selectedBusiness && { color: colors.text }]}>
									{selectedBusiness ? selectedBusiness.name?.en || '' : translate('select_business', 'Select Business')}
								</Text>
							</View>
							<Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
						</TouchableOpacity>
					</View>

					<View style={styles.fieldContainer}>
						<Text style={styles.fieldLabel}>
							{translate('default_product', 'Default Product')} <Text style={styles.required}>*</Text>
						</Text>
						<TouchableOpacity style={[styles.pickerButton, selectedDefaultProduct && styles.pickerButtonActive]} onPress={() => setShowDefaultProducts(true)}>
							<View style={[styles.pickerIcon, { backgroundColor: colors.primary + '15', overflow: 'hidden' }]}>
								<SmartImage source={selectedDefaultProduct?.media?.thumbnail?.url} style={{ width: '100%', height: '100%' }} resizeMode="cover" entityType="product" />
							</View>
							<View style={{ flex: 1 }}>
								<Text style={[styles.pickerText, selectedDefaultProduct && { color: colors.text }]}>
									{selectedDefaultProduct ? selectedDefaultProduct.name?.en || '' : translate('select_default_product', 'Select Default Product')}
								</Text>
							</View>
							<Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
						</TouchableOpacity>
					</View>

					<View style={styles.fieldContainer}>
						<Text style={styles.fieldLabel}>
							{translate('product_gallery', 'Product Gallery')} <Text style={styles.optional}>({translate('optional', 'Optional')})</Text>
							<Text style={{ fontSize: 12, fontWeight: 'normal', color: colors.textSecondary }}> ({uploadedGallery.length}/5)</Text>
						</Text>
						<View style={styles.galleryWrapper}>
							<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
								{uploadedGallery.map((item, idx) => (
									<View key={item._id || idx} style={styles.galleryItem}>
										<SmartImage source={item.url} style={styles.galleryImage} resizeMode="cover" entityType="product" />
										<TouchableOpacity style={styles.removeBadge} onPress={() => setUploadedGallery((prev) => prev.filter((f) => f._id !== item._id))}>
											<Ionicons name="close" size={14} color="#ffffff" />
										</TouchableOpacity>
									</View>
								))}
								{uploadedGallery.length < 5 && (
									<TouchableOpacity style={styles.addPhotoBtn} onPress={handleUploadPhoto} disabled={uploadingPhoto}>
										{uploadingPhoto ? (
											<ActivityIndicator size="small" color={colors.primary} />
										) : (
											<>
												<Ionicons name="camera-outline" size={24} color={colors.primary} />
												<Text style={styles.addPhotoText}>{translate('add_photo', 'Add Photo')}</Text>
											</>
										)}
									</TouchableOpacity>
								)}
							</ScrollView>
						</View>
					</View>
				</View>

				{/* PRODUCT NAMES CARD */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>{translate('product_names', 'Product Names')}</Text>

					<LocalizedFormInput label={translate('english_name', 'English Name')} value={productNameEn} onChangeText={setProductNameEn} lang="en" placeholder="e.g., Fresh Atlantic Salmon" required />

					<LocalizedFormInput
						label={translate('tunisian_latin_name', 'Tunisian Name (Latin)')}
						value={productNameTnLatn}
						onChangeText={setProductNameTnLatn}
						lang="tn_latn"
						placeholder="e.g., Salmon Fresh"
					/>

					<LocalizedFormInput
						label={translate('tunisian_arabic_name', 'Tunisian Name (Arabic)')}
						value={productNameTnArab}
						onChangeText={setProductNameTnArab}
						lang="tn_arab"
						placeholder="مثلا: سالمون طازج"
					/>
				</View>

				{/* PRICING & UNITS CARD */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>{translate('pricing_units', 'Pricing & Units')}</Text>

					<View style={styles.row}>
						<View style={styles.flexItem}>
							<Text style={styles.fieldLabel}>
								{translate('price_tnd', 'Price (TND)')} <Text style={styles.required}>*</Text>
							</Text>
							<View style={[styles.inputBox, { borderColor: priceTND ? colors.primary : colors.borderLight }]}>
								<Text style={styles.prefix}>TND</Text>
								<TextInput
									ref={priceInputRef}
									style={[styles.textInput, { color: colors.text }]}
									value={priceTND}
									onChangeText={setPriceTND}
									placeholder="0.00"
									placeholderTextColor={colors.textTertiary}
									keyboardType="decimal-pad"
								/>
							</View>
						</View>
						<View style={{ width: 12 }} />
						<View style={styles.flexItem}>
							<Text style={styles.fieldLabel}>
								{translate('unit', 'Unit')} <Text style={styles.required}>*</Text>
							</Text>
							<TouchableOpacity style={[styles.inputBox, { borderColor: unit ? colors.primary : colors.borderLight }]} onPress={() => setShowUnitPicker(true)}>
								<Text style={{ color: colors.text, flex: 1, fontSize: 16 }}>{unit || translate('select_unit', 'Select unit')}</Text>
								<Ionicons name="caret-down" size={16} color={colors.textSecondary} />
							</TouchableOpacity>
						</View>
					</View>

					<View style={styles.row}>
						<View style={styles.flexItem}>
							<Text style={styles.fieldLabel}>
								{translate('min_qty', 'Min Qty')} <Text style={styles.required}>*</Text>
							</Text>
							<View style={[styles.inputBox, { borderColor: minUnit ? colors.primary : colors.borderLight }]}>
								<TextInput
									style={[styles.textInput, { color: colors.text, textAlign: 'center' }]}
									value={minUnit}
									onChangeText={setMinUnit}
									placeholder="1"
									placeholderTextColor={colors.textTertiary}
									keyboardType="decimal-pad"
								/>
							</View>
						</View>
						<View style={{ width: 12 }} />
						<View style={styles.flexItem}>
							<Text style={styles.fieldLabel}>
								{translate('max_qty', 'Max Qty')} <Text style={styles.required}>*</Text>
							</Text>
							<View style={[styles.inputBox, { borderColor: maxUnit ? colors.primary : colors.borderLight }]}>
								<TextInput
									style={[styles.textInput, { color: colors.text, textAlign: 'center' }]}
									value={maxUnit}
									onChangeText={setMaxUnit}
									placeholder="10"
									placeholderTextColor={colors.textTertiary}
									keyboardType="decimal-pad"
								/>
							</View>
						</View>
						<View style={{ width: 12 }} />
						<View style={styles.flexItem}>
							<Text style={styles.fieldLabel}>
								{translate('step', 'Step')} <Text style={styles.required}>*</Text>
							</Text>
							<View style={[styles.inputBox, { borderColor: unitStep ? colors.primary : colors.borderLight }]}>
								<TextInput
									style={[styles.textInput, { color: colors.text, textAlign: 'center' }]}
									value={unitStep}
									onChangeText={setUnitStep}
									placeholder="1"
									placeholderTextColor={colors.textTertiary}
									keyboardType="decimal-pad"
								/>
							</View>
						</View>
					</View>
					<Text style={styles.infoHint}>
						{translate('price_per', 'Price per')} {unit || translate('unit', 'unit')}, {translate('range', 'range')}: {minUnit || '0'} - {maxUnit || '0'} {unit || translate('unit', 'unit')}
					</Text>
				</View>

				{/* INVENTORY CARD */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>
						{translate('inventory', 'Inventory')} <Text style={styles.optional}>({translate('optional', 'Optional')})</Text>
					</Text>

					<View style={styles.row}>
						<View style={styles.flexItem}>
							<Text style={styles.fieldLabel}>{translate('stock_quantity', 'Stock Quantity')}</Text>
							<View style={[styles.inputBox, { borderColor: stockQuantity ? colors.primary : colors.borderLight }]}>
								<Ionicons name="cube" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
								<TextInput
									style={[styles.textInput, { color: colors.text }]}
									value={stockQuantity}
									onChangeText={setStockQuantity}
									placeholder="100"
									placeholderTextColor={colors.textTertiary}
									keyboardType="number-pad"
								/>
							</View>
						</View>
						<View style={{ width: 16 }} />
						<View style={styles.flexItem}>
							<Text style={styles.fieldLabel}>{translate('alert_threshold', 'Alert Threshold')}</Text>
							<View style={[styles.inputBox, { borderColor: colors.warning || '#F59E0B' }]}>
								<Ionicons name="warning" size={20} color={colors.warning || '#F59E0B'} style={{ marginRight: 8 }} />
								<TextInput
									style={[styles.textInput, { color: colors.text }]}
									value={minThreshold}
									onChangeText={setMinThreshold}
									placeholder="10"
									placeholderTextColor={colors.textTertiary}
									keyboardType="number-pad"
								/>
							</View>
						</View>
					</View>
				</View>

				{/* PRODUCT SPECIFICATIONS CARD */}
				<View style={styles.card}>
					<Text style={styles.cardTitle}>
						{translate('product_specs', 'Product Specifications')} <Text style={styles.optional}>({translate('optional', 'Optional')})</Text>
					</Text>

					{/* Caliber Selection */}
					<View style={styles.fieldContainer}>
						<Text style={styles.fieldLabel}>
							{translate('caliber', 'Caliber')} <Text style={styles.required}>*</Text>
						</Text>
						<View style={styles.caliberContainer}>
							{([1, 2, 3, 4, 5] as const).map((val) => (
								<TouchableOpacity key={val} style={[styles.caliberButton, caliber === val && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setCaliber(val)}>
									<Text numberOfLines={1} adjustsFontSizeToFit style={[styles.caliberButtonText, caliber === val && { color: '#ffffff' }]}>
										{getCaliberLabel(val)}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>

					{/* Origin Address Section */}
					<Text style={[styles.fieldLabel, { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 12 }]}>{translate('origin_address', 'Origin Address')}</Text>

					<View style={styles.row}>
						<View style={styles.flexItem}>
							<Text style={styles.fieldLabel}>{translate('origin_street', 'Street')}</Text>
							<View style={[styles.inputBox, { borderColor: originStreet ? colors.primary : colors.borderLight }]}>
								<TextInput
									style={[styles.textInput, { color: colors.text }]}
									value={originStreet}
									onChangeText={setOriginStreet}
									placeholder={translate('street_placeholder', 'e.g., Rue de la Paix')}
									placeholderTextColor={colors.textTertiary}
								/>
							</View>
						</View>
					</View>

					<View style={styles.row}>
						<View style={styles.flexItem}>
							<Text style={styles.fieldLabel}>{translate('origin_city', 'City')}</Text>
							<View style={[styles.inputBox, { borderColor: originCity ? colors.primary : colors.borderLight }]}>
								<TextInput
									style={[styles.textInput, { color: colors.text }]}
									value={originCity}
									onChangeText={setOriginCity}
									placeholder={translate('city_placeholder', 'e.g., Ellouza')}
									placeholderTextColor={colors.textTertiary}
								/>
							</View>
						</View>
						<View style={{ width: 12 }} />
						<View style={styles.flexItem}>
							<Text style={styles.fieldLabel}>{translate('origin_region', 'Region')}</Text>
							<View style={[styles.inputBox, { borderColor: originRegion ? colors.primary : colors.borderLight }]}>
								<TextInput
									style={[styles.textInput, { color: colors.text }]}
									value={originRegion}
									onChangeText={setOriginRegion}
									placeholder={translate('region_placeholder', 'e.g., Sfax')}
									placeholderTextColor={colors.textTertiary}
								/>
							</View>
						</View>
					</View>

					<View style={styles.row}>
						<View style={styles.flexItem}>
							<Text style={styles.fieldLabel}>{translate('origin_postal_code', 'Postal Code')}</Text>
							<View style={[styles.inputBox, { borderColor: originPostalCode ? colors.primary : colors.borderLight }]}>
								<TextInput
									style={[styles.textInput, { color: colors.text }]}
									value={originPostalCode}
									onChangeText={setOriginPostalCode}
									placeholder="e.g., 3016"
									placeholderTextColor={colors.textTertiary}
									keyboardType="numeric"
								/>
							</View>
						</View>
						<View style={{ width: 12 }} />
						<View style={styles.flexItem}>
							<Text style={styles.fieldLabel}>{translate('origin_country', 'Country')}</Text>
							<View style={[styles.inputBox, { borderColor: originCountry ? colors.primary : colors.borderLight }]}>
								<TextInput
									style={[styles.textInput, { color: colors.text }]}
									value={originCountry}
									onChangeText={setOriginCountry}
									placeholder={translate('country_placeholder', 'e.g., Tunisia')}
									placeholderTextColor={colors.textTertiary}
								/>
							</View>
						</View>
					</View>
				</View>
				{/* Footer Button */}
				<View style={styles.footer}>
					<TouchableOpacity
						style={[
							styles.submitBtn,
							{
								backgroundColor: isFormValid ? colors.success || '#10B981' : 'transparent',
								borderColor: isFormValid ? colors.success || '#10B981' : colors.borderLight,
								borderWidth: 2,
								opacity: isFormValid && !creating ? 1 : 0.6
							}
						]}
						onPress={handleCreateProduct}
						disabled={!isFormValid || creating}
					>
						{creating ? (
							<ActivityIndicator color="#fff" size="small" />
						) : (
							<>
								<Text style={styles.submitBtnText}>{translate('create_product', 'Create Product')}</Text>
								<Ionicons name="checkmark-done" size={22} color="#fff" />
							</>
						)}
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingWrapper>

			{/* Businesses Modal */}
			<SearchableModalPicker
				visible={showBusinesses}
				title={translate('select_business', 'Select Business')}
				data={businesses}
				onSelect={handleSelectBusiness}
				onClose={() => setShowBusinesses(false)}
				selectedId={selectedBusiness?._id}
				keyExtractor={(item) => item._id}
				loading={loadingBusinesses}
				renderItem={(item, isSelected) => (
					<View style={[styles.listItem, { borderBottomColor: colors.border }]}>
						<View style={{ flex: 1 }}>
							<Text style={[styles.listTitle, { color: colors.text }]}>{item.name?.en || ''}</Text>
							<Text style={[styles.listSubtitle, { color: colors.textSecondary }]}>{item.address?.city || 'No address'}</Text>
						</View>
						{isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
					</View>
				)}
			/>

			{/* Default Products Modal */}
			<SearchableModalPicker
				visible={showDefaultProducts}
				title={translate('select_default_product', 'Select Default Product')}
				data={defaultProducts}
				onSelect={handleSelectDefaultProduct}
				onClose={() => setShowDefaultProducts(false)}
				selectedId={selectedDefaultProduct?._id}
				searchPlaceholder={translate('search_products', 'Search products...')}
				searchKeyExtractor={(item) => item.name?.en || ''}
				keyExtractor={(item) => item._id}
				loading={loadingDefaults}
				renderItem={(item, isSelected) => (
					<View style={[styles.listItem, { borderBottomColor: colors.border }]}>
						<View style={styles.listThumbContainer}>
							<SmartImage source={item.media?.thumbnail?.url} style={styles.listThumb} resizeMode="cover" entityType="product" />
						</View>
						<View style={{ flex: 1 }}>
							<Text style={[styles.listTitle, { color: colors.text }]}>{item.name?.en || ''}</Text>
							{item.searchKeywords && item.searchKeywords.length > 0 && (
								<Text style={[styles.listSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
									{item.searchKeywords.join(', ')}
								</Text>
							)}
						</View>
						{isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
					</View>
				)}
			/>

			{/* Unit Picker Modal */}
			<Modal visible={showUnitPicker} animationType="slide" transparent onRequestClose={() => setShowUnitPicker(false)}>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: '65%' }]}>
						<View style={styles.modalHeader}>
							<Text style={[styles.modalTitle, { color: colors.text }]}>{translate('select_unit', 'Select Unit')}</Text>
							<TouchableOpacity onPress={() => setShowUnitPicker(false)} style={styles.closeBtn}>
								<Ionicons name="close" size={24} color={colors.error || '#EF4444'} />
							</TouchableOpacity>
						</View>
						<FlatList
							data={COMMON_UNITS}
							keyExtractor={(item) => item}
							renderItem={({ item }) => (
								<TouchableOpacity style={[styles.listItem, { borderBottomColor: colors.border }]} onPress={() => handleUnitSelect(item)}>
									<View style={{ flex: 1 }}>
										<Text style={[styles.listTitle, { color: colors.text }]}>{item}</Text>
										<Text style={[styles.listSubtitle, { color: colors.textSecondary }]}>{UNIT_LABELS[item]}</Text>
									</View>
									{unit === item && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
								</TouchableOpacity>
							)}
						/>
						{/* Custom unit option */}
						<View style={{ padding: 20 }}>
							<Text style={[styles.fieldLabel, { marginBottom: 12 }]}>{translate('or_enter_custom_unit', 'Or enter custom unit:')}</Text>
							<View style={[styles.inputBox, { borderColor: colors.border }]}>
								<TextInput
									style={[styles.textInput, { color: colors.text, flex: 1 }]}
									placeholder="e.g., Bag, Tray"
									placeholderTextColor={colors.textTertiary}
									onChangeText={setUnit}
									value={COMMON_UNITS.includes(unit) ? '' : unit}
									autoCapitalize="words"
								/>
								<TouchableOpacity onPress={() => setShowUnitPicker(false)} style={[styles.applyBtn, { backgroundColor: 'transparent', borderColor: colors.success || '#10B981', borderWidth: 1.5 }]}>
									<Text style={[styles.applyBtnText, { color: colors.success || '#10B981' }]}>{translate('apply', 'Apply')}</Text>
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
			padding: 16,
			paddingBottom: 40,
			gap: 16,
			width: '100%',
			maxWidth: 800,
			alignSelf: 'center'
		},
		card: {
			backgroundColor: colors.surfaceVariant,
			borderRadius: 16,
			padding: 20,
			...Platform.select({
				web: {
					boxShadow: '0px 8px 24px rgba(0,0,0,0.06)',
					outlineStyle: 'solid',
					outlineWidth: 1.5,
					outlineColor: '#FFFFFF'
				} as any,
				default: {
					...createShadow({ offsetY: 4, opacity: 0.08, radius: 12, elevation: 3 })
				}
			}),
			borderWidth: 1.5,
			borderColor: '#FFFFFF'
		},
		cardTitle: {
			fontSize: 18,
			fontWeight: '700',
			color: colors.text,
			marginBottom: 16,
			borderBottomWidth: 1,
			borderBottomColor: colors.border,
			paddingBottom: 8
		},
		fieldContainer: {
			marginBottom: 16
		},
		fieldLabel: {
			fontSize: 14,
			fontWeight: '600',
			color: colors.textSecondary,
			marginBottom: 8
		},
		required: {
			color: '#EF4444'
		},
		optional: {
			fontSize: 12,
			fontWeight: '500',
			color: colors.textTertiary
		},
		inputBox: {
			flexDirection: 'row',
			alignItems: 'center',
			borderWidth: 1.5,
			borderRadius: 12,
			paddingHorizontal: 12,
			height: 48,
			backgroundColor: colors.background,
			...Platform.select({
				web: {
					transition: 'all 0.2s ease',
					outlineStyle: 'solid',
					outlineWidth: 1.5,
					outlineColor: colors.border
				} as any,
				default: {}
			})
		},
		textInput: {
			flex: 1,
			fontSize: 15,
			height: '100%'
		},
		inputFlag: {
			fontSize: 16,
			marginRight: 8
		},
		prefix: {
			fontSize: 14,
			fontWeight: '700',
			color: colors.textSecondary,
			marginRight: 8
		},
		pickerButton: {
			flexDirection: 'row',
			alignItems: 'center',
			borderWidth: 1.5,
			borderColor: colors.border,
			borderRadius: 12,
			padding: 12,
			backgroundColor: colors.background,
			...Platform.select({
				web: {
					outlineStyle: 'solid',
					outlineWidth: 1.5,
					outlineColor: colors.border
				} as any,
				default: {}
			})
		},
		pickerButtonActive: {
			borderColor: colors.primary,
			backgroundColor: colors.primary + '05'
		},
		pickerIcon: {
			width: 40,
			height: 40,
			borderRadius: 10,
			justifyContent: 'center',
			alignItems: 'center',
			marginRight: 12
		},
		pickerText: {
			fontSize: 15,
			fontWeight: '600',
			color: colors.textSecondary
		},
		photoUploadRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 16
		},
		photoPreview: {
			width: 72,
			height: 72,
			borderRadius: 12,
			borderWidth: 2,
			borderStyle: 'dashed',
			justifyContent: 'center',
			alignItems: 'center',
			overflow: 'hidden'
		},
		photoImage: {
			width: '100%',
			height: '100%'
		},
		photoHint: {
			fontSize: 12,
			color: colors.textTertiary,
			marginBottom: 8,
			lineHeight: 16
		},
		uploadBtn: {
			flexDirection: 'row',
			alignItems: 'center',
			alignSelf: 'flex-start',
			paddingHorizontal: 12,
			paddingVertical: 8,
			borderRadius: 8,
			gap: 6
		},
		uploadBtnText: {
			color: '#fff',
			fontWeight: '600',
			fontSize: 13
		},
		row: {
			flexDirection: 'row',
			marginBottom: 12
		},
		flexItem: {
			flex: 1
		},
		infoHint: {
			fontSize: 12,
			color: colors.textTertiary,
			fontStyle: 'italic',
			marginTop: 4
		},
		footer: {
			padding: 16,
			backgroundColor: colors.surfaceVariant,
			borderTopWidth: 1.5,
			borderTopColor: '#FFFFFF',
			alignItems: 'center'
		},
		submitBtn: {
			width: '100%',
			maxWidth: 800,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			height: 54,
			borderRadius: 12,
			gap: 8,
			...createShadow({ offsetY: 2, opacity: 0.1, radius: 4, elevation: 3 })
		},
		submitBtnText: {
			color: '#fff',
			fontSize: 17,
			fontWeight: '700'
		},
		modalOverlay: {
			flex: 1,
			backgroundColor: 'rgba(0,0,0,0.5)',
			justifyContent: 'flex-end'
		},
		modalContent: {
			borderTopLeftRadius: 24,
			borderTopRightRadius: 24,
			maxHeight: '85%'
		},
		modalHeader: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			padding: 20,
			borderBottomWidth: 1,
			borderBottomColor: 'rgba(0,0,0,0.05)'
		},
		modalTitle: {
			fontSize: 18,
			fontWeight: '700'
		},
		closeBtn: {
			padding: 6,
			borderWidth: 1.5,
			borderColor: colors.error || '#EF4444',
			borderRadius: 8
		},
		searchContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			margin: 16,
			paddingHorizontal: 12,
			height: 48,
			borderRadius: 12,
			borderWidth: 1
		},
		searchInput: {
			flex: 1,
			marginLeft: 8,
			fontSize: 15
		},
		listItem: {
			flexDirection: 'row',
			alignItems: 'center',
			padding: 16,
			borderBottomWidth: 1
		},
		listTitle: {
			fontSize: 16,
			fontWeight: '600',
			marginBottom: 4
		},
		listSubtitle: {
			fontSize: 13
		},
		listThumbContainer: {
			marginRight: 16
		},
		listThumb: {
			width: 48,
			height: 48,
			borderRadius: 10
		},
		emptyState: {
			textAlign: 'center',
			marginTop: 40,
			fontSize: 15,
			paddingHorizontal: 20
		},
		applyBtn: {
			paddingHorizontal: 12,
			paddingVertical: 8,
			borderRadius: 8,
			marginLeft: 8
		},
		applyBtnText: {
			color: '#fff',
			fontWeight: '700',
			fontSize: 14
		},
		suffix: {
			fontSize: 14,
			fontWeight: '700',
			color: colors.textSecondary,
			marginLeft: 8
		},
		caliberContainer: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			gap: 8,
			marginTop: 8,
			marginBottom: 8
		},
		caliberButton: {
			flex: 1,
			height: 44,
			borderRadius: 10,
			borderWidth: 1.5,
			borderColor: colors.border,
			backgroundColor: colors.background,
			justifyContent: 'center',
			alignItems: 'center',
			...Platform.select({
				web: {
					transition: 'all 0.2s ease'
				} as any,
				default: {}
			})
		},
		caliberButtonText: {
			fontSize: 12,
			fontWeight: '700',
			color: colors.textSecondary
		},
		caliberHelpText: {
			fontSize: 12,
			fontWeight: '600',
			color: colors.primary,
			marginTop: 4,
			marginBottom: 12
		},
		galleryWrapper: {
			marginTop: 4,
			minHeight: 80
		},
		galleryScroll: {
			flexDirection: 'row',
			gap: 12,
			alignItems: 'center'
		},
		galleryItem: {
			width: 72,
			height: 72,
			borderRadius: 12,
			overflow: 'hidden',
			position: 'relative',
			borderWidth: 1.5,
			borderColor: colors.border
		},
		galleryImage: {
			width: '100%',
			height: '100%'
		},
		removeBadge: {
			position: 'absolute',
			top: 4,
			right: 4,
			backgroundColor: 'rgba(0,0,0,0.6)',
			borderRadius: 10,
			width: 20,
			height: 20,
			justifyContent: 'center',
			alignItems: 'center',
			zIndex: 10
		},
		addPhotoBtn: {
			width: 72,
			height: 72,
			borderRadius: 12,
			borderWidth: 2,
			borderStyle: 'dashed',
			borderColor: colors.primary,
			backgroundColor: colors.surfaceVariant,
			justifyContent: 'center',
			alignItems: 'center',
			gap: 4
		},
		addPhotoText: {
			fontSize: 10,
			fontWeight: '700',
			color: colors.primary
		}
	})
