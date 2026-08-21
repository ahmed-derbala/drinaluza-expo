import React, { useEffect, useState, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform, TextInput, KeyboardAvoidingView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, themeColors } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import { useLayout } from '@/core/contexts/LayoutContext'
import { createProduct, getDefaultProducts, type DefaultProduct } from '@/features/products/products.api'
import { FileRef } from '@/features/products/products.type'
import { getMyBusinesses } from '@/features/businesses/businesses.api'
import { Business } from '@/features/businesses/businesses.interface'
import { SmartHeader } from '@/core/smart-header'
import Spinner from '@/features/common/Spinner'
import { SmartMediaView, SmartMediaThumbnailBlock, isDeferredMediaFile, uploadThumbnail, MAX_FILE_COUNT, pickMediaFiles, uploadGallery, type UploadMediaFile, type MediaFile } from '@/core/smart-media'
import type { LocalizedName } from '@/features/common/address'
import { toast } from '@/features/common/Toast'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import SearchableModalPicker from '@/features/common/SearchableModalPicker'
import { showAlert } from '@/core/helpers/popup'
import { log } from '@/core/log'

// Import the reusable section components
import ProductNamesSection from '@/features/products/common/ProductNamesSection'
import ProductPricingSection from '@/features/products/common/ProductPricingSection'
import ProductStockSection from '@/features/products/common/ProductStockSection'
import ProductGallerySection from '@/features/products/common/ProductGallerySection'
import ProductSpecsSection from '@/features/products/common/ProductSpecsSection'

type PickedFileRef = FileRef & { pickedFile?: UploadMediaFile }

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
	const [singlePieceMinWeightKg, setSinglePieceMinWeightKg] = useState('')
	const [singlePieceAvgWeightKg, setSinglePieceAvgWeightKg] = useState('')
	const [singlePieceMaxWeightKg, setSinglePieceMaxWeightKg] = useState('')

	// Inventory
	const [stockQuantity, setStockQuantity] = useState('100')
	const [minThreshold, setMinThreshold] = useState('10')
	const [uploadedGallery, setUploadedGallery] = useState<PickedFileRef[]>([])
	const [thumbnail, setThumbnail] = useState<MediaFile | null>(null)

	// Specs
	const [caliber, setCaliber] = useState<1 | 2 | 3 | 4 | 5>(3)
	const [harvest, setHarvest] = useState<'wild' | 'farm'>('farm')
	const [originStreet, setOriginStreet] = useState<LocalizedName>({ en: '', tn_latn: '', tn_arab: '' })
	const [originCity, setOriginCity] = useState('Ellouza')
	const [originRegion, setOriginRegion] = useState('Sfax')
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
		setThumbnail(product.media?.thumbnail?.url ? { _id: 'thumb', url: product.media.thumbnail.url } : null)
		setShowDefaultProducts(false)
	}

	const filteredDefaultProducts = useMemo(() => {
		return defaultProducts.filter((p) => (p.name?.en || '').toLowerCase().includes(searchQuery.toLowerCase()))
	}, [defaultProducts, searchQuery])

	const handleUploadPhoto = async () => {
		try {
			const remainingSlots = Math.max(0, MAX_FILE_COUNT - uploadedGallery.length)
			if (remainingSlots <= 0) {
				showAlert(translate('limit_reached', 'Limit Reached'), translate('err_max_photos', 'You can upload up to 5 photos.'))
				return
			}

			const picked = await pickMediaFiles({ mediaType: 'image', multiple: true, maxCount: remainingSlots })
			if (picked.length === 0) return

			setUploadingPhoto(true)
			const entries: PickedFileRef[] = picked.map((file, index) => ({
				_id: `pending-${Date.now()}-${index}`,
				name: file.name,
				extension: file.name.split('.').pop(),
				url: file.uri,
				mimetype: file.mimeType,
				size: file.size,
				pickedFile: file
			}))
			setUploadedGallery((prev) => [...prev, ...entries])
		} catch (error: any) {
			console.error('Error picking photos:', error)
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

		const minW = singlePieceMinWeightKg ? parseFloat(singlePieceMinWeightKg) : NaN
		const avgW = singlePieceAvgWeightKg ? parseFloat(singlePieceAvgWeightKg) : NaN
		const maxW = singlePieceMaxWeightKg ? parseFloat(singlePieceMaxWeightKg) : NaN
		if ((!isNaN(minW) && minW <= 0) || (!isNaN(avgW) && avgW <= 0) || (!isNaN(maxW) && maxW <= 0)) {
			showAlert(translate('validation_error', 'Validation Error'), translate('err_weight_positive', 'Single piece weights must be greater than 0'))
			return false
		}
		if ((!isNaN(maxW) && !isNaN(minW) && maxW < minW) || (!isNaN(maxW) && !isNaN(avgW) && maxW < avgW) || (!isNaN(avgW) && !isNaN(minW) && avgW < minW)) {
			showAlert(translate('validation_error', 'Validation Error'), translate('err_weight_range', 'Max weight ≥ avg weight ≥ min weight'))
			return false
		}
		return true
	}

	const handleCreateProduct = async () => {
		if (!validateForm() || !selectedBusiness || !selectedDefaultProduct) return

		try {
			setSaving(true)
			const enName = productNameEn.trim()
			const productData: any = {
				business: { slug: selectedBusiness.slug, _id: selectedBusiness._id },
				defaultProduct: { slug: selectedDefaultProduct.slug, _id: selectedDefaultProduct._id },
				name: {
					en: enName,
					tn_latn: productNameTnLatn.trim() || enName,
					tn_arab: productNameTnArab.trim() || enName
				},
				price: { total: { tnd: parseFloat(priceTND) } },
				unit: {
					measure: unit,
					min: parseFloat(minUnit),
					max: parseFloat(maxUnit),
					step: parseFloat(unitStep),
					singlePiece: [singlePieceMinWeightKg, singlePieceAvgWeightKg, singlePieceMaxWeightKg].some((v) => v.trim().length > 0)
						? {
								minWeightKg: singlePieceMinWeightKg ? parseFloat(singlePieceMinWeightKg) : undefined,
								avgWeightKg: singlePieceAvgWeightKg ? parseFloat(singlePieceAvgWeightKg) : undefined,
								maxWeightKg: singlePieceMaxWeightKg ? parseFloat(singlePieceMaxWeightKg) : undefined
							}
						: undefined
				},
				stock: stockQuantity ? { quantity: parseInt(stockQuantity), minThreshold: parseInt(minThreshold) } : undefined,
				availability: { startDate: new Date().toISOString(), endDate: null },
				media: {
					thumbnail: thumbnail && !isDeferredMediaFile(thumbnail) ? { url: thumbnail.url } : undefined,
					gallery: uploadedGallery.filter((img) => !img.pickedFile)
				},
				specs: {
					caliber,
					harvest,
					origin: {
						street: originStreet.en.trim()
							? {
									en: originStreet.en.trim(),
									tn_latn: originStreet.tn_latn?.trim() || originStreet.en.trim(),
									tn_arab: originStreet.tn_arab?.trim() || originStreet.en.trim()
								}
							: undefined,
						city: originCity.trim() || 'Ellouza',
						region: originRegion.trim() || 'Sfax',
						country: originCountry.trim() || 'Tunisia'
					}
				},
				state: { code: 'active' }
			}

			const created = await createProduct(productData)
			log({ level: 'info', label: 'CreateProductScreen', message: 'Product created successfully', data: productData })

			const pendingFiles = uploadedGallery.map((item) => item.pickedFile).filter((file): file is UploadMediaFile => Boolean(file))
			if (pendingFiles.length > 0) {
				await uploadGallery({ targetModelName: 'products', targetModelId: created.data._id, files: pendingFiles })
			}
			if (thumbnail && isDeferredMediaFile(thumbnail)) {
				await uploadThumbnail({ targetModelName: 'products', targetModelId: created.data._id, file: thumbnail.pickedFile })
			}

			toast.show({ title: translate('success', 'Success'), content: translate('product_created_success', 'Product created successfully!'), borderColor: colors.success })
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
					{saving && <Spinner size="small" expand={false} style={styles.savingOverlay} />}

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
									<SmartMediaView media={selectedDefaultProduct?.media?.thumbnail?.url} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
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

					{/* Thumbnail Card */}
					<View style={styles.card}>
						<Text style={styles.cardTitle}>{translate('thumbnail', 'Thumbnail')}</Text>
						<SmartMediaThumbnailBlock thumbnail={thumbnail} targetModelName="products" mediaType="image" deferUpload onChange={setThumbnail} />
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
						singlePieceMinWeightKg={singlePieceMinWeightKg}
						setSinglePieceMinWeightKg={setSinglePieceMinWeightKg}
						singlePieceAvgWeightKg={singlePieceAvgWeightKg}
						setSinglePieceAvgWeightKg={setSinglePieceAvgWeightKg}
						singlePieceMaxWeightKg={singlePieceMaxWeightKg}
						setSinglePieceMaxWeightKg={setSinglePieceMaxWeightKg}
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
						harvest={harvest}
						setHarvest={setHarvest}
						originStreet={originStreet}
						setOriginStreet={setOriginStreet}
						originCity={originCity}
						setOriginCity={setOriginCity}
						originRegion={originRegion}
						setOriginRegion={setOriginRegion}
						originCountry={originCountry}
						setOriginCountry={setOriginCountry}
					/>

					{/* Submit button */}
					<View style={{ padding: 16, marginTop: 12 }}>
						{saving ? (
							<Spinner size="small" expand={false} />
						) : (
							<TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleCreateProduct}>
								<Text style={styles.submitBtnText}>{translate('create_product', 'Create Product')}</Text>
								<Ionicons name="checkmark-done" size={22} color={themeColors.buttonText} />
							</TouchableOpacity>
						)}
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
							<SmartMediaView media={item.media?.thumbnail?.url} style={styles.listThumb} resizeMode="cover" />
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
			backgroundColor: themeColors.background75,
			paddingVertical: 10,
			paddingHorizontal: 20,
			borderRadius: 30
		},
		card: {
			backgroundColor: colors.background,
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
			color: colors.error
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
			color: themeColors.buttonText,
			fontSize: 16,
			fontWeight: '700'
		}
	})
