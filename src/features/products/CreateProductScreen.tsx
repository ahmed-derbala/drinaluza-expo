import React, { useEffect, useState, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform, TextInput, KeyboardAvoidingView, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import { useLayout } from '@/core/contexts/LayoutContext'
import { createProduct, getDefaultProducts, type DefaultProduct } from '@/features/products/products.api'
import { FileRef } from '@/features/products/products.type'
import { getMyBusinesses } from '@/features/businesses/businesses.api'
import { Business } from '@/features/businesses/businesses.interface'
import { SmartHeader } from '@/core/smart-header'
import SmartImage from '@/core/SmartImageViewer'
import { toast } from '@/features/common/Toast'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import SearchableModalPicker from '@/features/common/SearchableModalPicker'
import { showAlert } from '@/core/helpers/popup'
import { log } from '@/core/log'
import { uploadFile } from '@/core/file'

// Import the reusable section components
import ProductNamesSection from '@/features/products/common/ProductNamesSection'
import ProductPricingSection from '@/features/products/common/ProductPricingSection'
import ProductStockSection from '@/features/products/common/ProductStockSection'
import ProductGallerySection from '@/features/products/common/ProductGallerySection'
import ProductSpecsSection from '@/features/products/common/ProductSpecsSection'

export default function CreateProductScreen() {
	const { businessSlug, businessId } = useLocalSearchParams<{ businessSlug?: string; businessId?: string }>()
	const router = useRouter()
	const { colors } = useTheme()
	const { translate } = useUser()
	const { onScroll } = useScrollHandler()
	const { setTabBarVisible } = useLayout()
	const insets = useSafeAreaInsets()

	// Form States
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

	// Specs
	const [caliber, setCaliber] = useState<1 | 2 | 3 | 4 | 5>(3)
	const [originStreet, setOriginStreet] = useState('')
	const [originCity, setOriginCity] = useState('Ellouza')
	const [originRegion, setOriginRegion] = useState('Sfax')
	const [originPostalCode, setOriginPostalCode] = useState('3016')
	const [originCountry, setOriginCountry] = useState('Tunisia')

	// Picker / UI loading states
	const [businesses, setBusinesses] = useState<Business[]>([])
	const [defaultProducts, setDefaultProducts] = useState<DefaultProduct[]>([])
	const [loadingBusinesses, setLoadingBusinesses] = useState(false)
	const [loadingDefaults, setLoadingDefaults] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const [showBusinesses, setShowBusinesses] = useState(false)
	const [showDefaultProducts, setShowDefaultProducts] = useState(false)
	const [uploadingPhoto, setUploadingPhoto] = useState(false)
	const [saving, setSaving] = useState(false)

	// Hide bottom tab bar
	useEffect(() => {
		setTabBarVisible(false)
		return () => {
			setTabBarVisible(true)
		}
	}, [setTabBarVisible])

	// Load Businesses & Default Products
	useEffect(() => {
		loadBusinesses()
		loadDefaultProducts()
	}, [])

	// Auto-select business if navigated with param
	useEffect(() => {
		if ((businessId || businessSlug) && businesses.length > 0 && !selectedBusiness) {
			const matched = businesses.find((b) => b._id === businessId || b.slug === businessSlug)
			if (matched) setSelectedBusiness(matched)
		}
	}, [businessId, businessSlug, businesses, selectedBusiness])

	const loadBusinesses = async () => {
		try {
			setLoadingBusinesses(true)
			const response = await getMyBusinesses()
			setBusinesses(response.data.docs || [])
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

	const handleSelectBusiness = (business: Business) => {
		setSelectedBusiness(business)
		setShowBusinesses(false)
	}

	const handleSelectDefaultProduct = (product: DefaultProduct) => {
		setSelectedDefaultProduct(product)
		setProductNameEn(product.name?.en || '')
		setProductNameTnLatn(product.name?.tn_latn || '')
		setProductNameTnArab(product.name?.tn_arab || '')
		if (product.media?.thumbnail?.url) {
			setUploadedGallery([{ _id: 'thumb', url: product.media.thumbnail.url }])
		}
		setShowDefaultProducts(false)
	}

	const filteredDefaultProducts = useMemo(() => {
		return defaultProducts.filter((p) => (p.name?.en || '').toLowerCase().includes(searchQuery.toLowerCase()))
	}, [defaultProducts, searchQuery])

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

	const validateForm = () => {
		if (!productNameEn.trim()) {
			showAlert(translate('validation_error', 'Validation Error'), translate('err_enter_product_name', 'Please enter a product name (English)'))
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

	const handleCreateProduct = async () => {
		if (!validateForm() || !selectedBusiness || !selectedDefaultProduct) return

		try {
			setSaving(true)
			const productData: any = {
				business: { slug: selectedBusiness.slug, _id: selectedBusiness._id },
				defaultProduct: { slug: selectedDefaultProduct.slug, _id: selectedDefaultProduct._id },
				name: {
					en: productNameEn.trim(),
					tn_latn: productNameTnLatn.trim() || undefined,
					tn_arab: productNameTnArab.trim() || undefined
				},
				price: { total: { tnd: parseFloat(priceTND) } },
				unit: {
					measure: unit,
					min: parseFloat(minUnit),
					max: parseFloat(maxUnit),
					step: parseFloat(unitStep)
				},
				searchKeywords: selectedDefaultProduct.searchKeywords,
				stock: stockQuantity ? { quantity: parseInt(stockQuantity), minThreshold: parseInt(minThreshold) } : undefined,
				availability: { startDate: new Date().toISOString(), endDate: null },
				media: {
					thumbnail: selectedDefaultProduct?.media?.thumbnail ? { url: selectedDefaultProduct.media.thumbnail.url } : undefined,
					gallery: uploadedGallery.filter((img) => img._id !== 'thumb')
				},
				specs: {
					caliber,
					origin: {
						street: originStreet.trim() || undefined,
						city: originCity.trim() || undefined,
						region: originRegion.trim() || undefined,
						postalCode: originPostalCode.trim() || undefined,
						country: originCountry.trim() || undefined
					}
				},
				state: { code: 'active' }
			}

			await createProduct(productData)
			log({ level: 'info', label: 'CreateProductScreen', message: 'Product created successfully', data: productData })
			toast.show({ title: translate('success', 'Success'), message: translate('product_created_success', 'Product created successfully!'), color: colors.success })
			router.replace(`/dashboard/${selectedBusiness.slug}/products` as never)
		} catch (error: any) {
			console.error('Failed to create product:', error)
			showAlert(translate('error', 'Error'), error?.response?.data?.message || translate('err_create_failed', 'Failed to create product. Please try again.'))
		} finally {
			setSaving(false)
		}
	}

	const styles = createStyles(colors)

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen
				options={
					{
						title: translate('create_product', 'Create Product'),
						headerActions: []
					} as any
				}
			/>

			<KeyboardAvoidingView style={styles.form} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
				<SmartHeader.ScrollView
					style={styles.form}
					contentContainerStyle={[styles.formContent, styles.grow]}
					onScroll={onScroll}
					scrollEventThrottle={16}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					{saving && (
						<View style={styles.savingOverlay}>
							<ActivityIndicator size="small" color={colors.primary} />
							<Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginLeft: 8 }}>{translate('saving', 'Saving...')}</Text>
						</View>
					)}

					{/* Business & Category Picker */}
					<View style={styles.card}>
						<Text style={styles.cardTitle}>{translate('business_category', 'Business & Category')}</Text>
						<View style={styles.fieldContainer}>
							<Text style={styles.fieldLabel}>
								{translate('business', 'Business')} <Text style={styles.required}>*</Text>
							</Text>
							<TouchableOpacity style={[styles.pickerButton, selectedBusiness && styles.pickerButtonActive]} onPress={() => setShowBusinesses(true)}>
								<View style={[styles.pickerIcon, { backgroundColor: colors.primary + '15' }]}>
									<Text style={{ fontSize: 18 }}>🏪</Text>
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
					</View>

					{/* Gallery Card */}
					<View style={styles.card}>
						<Text style={styles.cardTitle}>{translate('gallery', 'Gallery')}</Text>
						<ProductGallerySection
							editable={true}
							gallery={uploadedGallery}
							colors={colors}
							translate={translate}
							onUploadPress={handleUploadPhoto}
							onRemovePress={(item) => setUploadedGallery((prev) => prev.filter((img) => img._id !== item._id))}
							uploading={uploadingPhoto}
						/>
					</View>

					{/* Name Section */}
					<ProductNamesSection
						variant="create"
						colors={colors}
						translate={translate}
						nameEn={productNameEn}
						setNameEn={setProductNameEn}
						nameTnLatn={productNameTnLatn}
						setNameTnLatn={setProductNameTnLatn}
						nameTnArab={productNameTnArab}
						setNameTnArab={setProductNameTnArab}
					/>

					{/* Pricing Section */}
					<ProductPricingSection
						variant="create"
						colors={colors}
						translate={translate}
						priceTND={priceTND}
						setPriceTND={setPriceTND}
						unit={unit}
						setUnit={setUnit}
						minUnit={minUnit}
						setMinUnit={setMinUnit}
						maxUnit={maxUnit}
						setMaxUnit={setMaxUnit}
						unitStep={unitStep}
						setUnitStep={setUnitStep}
					/>

					{/* Stock Section */}
					<ProductStockSection
						variant="create"
						colors={colors}
						translate={translate}
						stockQuantity={stockQuantity}
						setStockQuantity={setStockQuantity}
						minThreshold={minThreshold}
						setMinThreshold={setMinThreshold}
					/>

					{/* Specs Card */}
					<ProductSpecsSection
						editable={true}
						colors={colors}
						translate={translate}
						caliber={caliber}
						setCaliber={setCaliber}
						originStreet={originStreet}
						setOriginStreet={setOriginStreet}
						originCity={originCity}
						setOriginCity={setOriginCity}
						originRegion={originRegion}
						setOriginRegion={setOriginRegion}
						originPostalCode={originPostalCode}
						setOriginPostalCode={setOriginPostalCode}
						originCountry={originCountry}
						setOriginCountry={setOriginCountry}
					/>

					{/* Submit button */}
					<View style={{ padding: 16, marginTop: 12 }}>
						<TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleCreateProduct} disabled={saving}>
							{saving ? (
								<ActivityIndicator size="small" color="#fff" />
							) : (
								<>
									<Text style={styles.submitBtnText}>{translate('create_product', 'Create Product')}</Text>
									<Ionicons name="checkmark-done" size={22} color="#fff" />
								</>
							)}
						</TouchableOpacity>
					</View>
				</SmartHeader.ScrollView>
			</KeyboardAvoidingView>

			{/* Businesses Picker Modal */}
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

			{/* Default Products Picker Modal */}
			<SearchableModalPicker
				visible={showDefaultProducts}
				title={translate('select_default_product', 'Select Default Product')}
				data={filteredDefaultProducts}
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
							{item.searchKeywords && item.searchKeywords.length > 0 && <Text style={[styles.listSubtitle, { color: colors.textSecondary }]}>{item.searchKeywords.join(', ')}</Text>}
						</View>
						{isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
					</View>
				)}
			/>
		</View>
	)
}

const createStyles = (colors: any) =>
	StyleSheet.create({
		container: {
			flex: 1
		},
		form: {
			flex: 1
		},
		formContent: {
			alignSelf: 'center',
			width: '100%',
			maxWidth: 800,
			paddingHorizontal: 16,
			paddingTop: 16,
			paddingBottom: 40
		},
		grow: {
			flexGrow: 1
		},
		savingOverlay: {
			position: 'absolute',
			top: 20,
			alignSelf: 'center',
			zIndex: 100,
			flexDirection: 'row',
			alignItems: 'center',
			backgroundColor: 'rgba(0,0,0,0.8)',
			paddingVertical: 10,
			paddingHorizontal: 20,
			borderRadius: 30
		},
		card: {
			backgroundColor: colors.card,
			borderRadius: 16,
			padding: 16,
			marginBottom: 16,
			borderWidth: 1,
			borderColor: colors.border
		},
		cardTitle: {
			fontSize: 16,
			fontWeight: '700',
			color: colors.text,
			marginBottom: 16
		},
		fieldContainer: {
			marginBottom: 16
		},
		fieldLabel: {
			fontSize: 14,
			fontWeight: '700',
			color: colors.text,
			marginBottom: 8
		},
		required: {
			color: colors.error || '#EF4444'
		},
		pickerButton: {
			height: 54,
			borderRadius: 12,
			borderWidth: 1.5,
			borderColor: colors.border,
			backgroundColor: colors.surfaceVariant,
			paddingHorizontal: 12,
			flexDirection: 'row',
			alignItems: 'center',
			gap: 12
		},
		pickerButtonActive: {
			borderColor: colors.primary
		},
		pickerIcon: {
			width: 32,
			height: 32,
			borderRadius: 8,
			justifyContent: 'center',
			alignItems: 'center'
		},
		pickerText: {
			fontSize: 15,
			color: colors.textSecondary,
			fontWeight: '600'
		},
		listItem: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingVertical: 14,
			paddingHorizontal: 16,
			borderBottomWidth: 1
		},
		listTitle: {
			fontSize: 16,
			fontWeight: '600'
		},
		listSubtitle: {
			fontSize: 13,
			marginTop: 2
		},
		listThumbContainer: {
			width: 40,
			height: 40,
			borderRadius: 8,
			overflow: 'hidden',
			marginRight: 12
		},
		listThumb: {
			width: '100%',
			height: '100%'
		},
		submitBtn: {
			height: 52,
			borderRadius: 14,
			flexDirection: 'row',
			justifyContent: 'center',
			alignItems: 'center',
			gap: 10
		},
		submitBtnText: {
			color: '#fff',
			fontSize: 16,
			fontWeight: '700'
		}
	})
