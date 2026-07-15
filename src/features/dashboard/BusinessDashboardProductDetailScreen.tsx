import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, ScrollView, KeyboardAvoidingView, RefreshControl } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import { useLayout } from '@/core/contexts/LayoutContext'
import { getProductBySlug, updateProduct } from '@/features/products/products.api'
import { ProductType, FileRef } from '@/features/products/products.type'
import ProductNamesSection from '@/features/products/common/ProductNamesSection'
import ProductPricingSection from '@/features/products/common/ProductPricingSection'
import ProductStockSection from '@/features/products/common/ProductStockSection'
import ProductGallerySection from '@/features/products/common/ProductGallerySection'
import ProductSpecsSection from '@/features/products/common/ProductSpecsSection'
import ErrorState from '@/features/common/ErrorState'
import LoadingState from '@/features/common/LoadingState'
import { SmartHeader } from '@/core/smart-header'
import SmartImage from '@/core/SmartImageViewer'
import StateBadge from '@/features/common/StateBadge'
import { toast } from '@/features/common/Toast'
import { uploadFile } from '@/core/file'
import { parseError } from '@/core/helpers/errorHandler'
import { LinearGradient } from 'expo-linear-gradient'

export default function BusinessDashboardProductDetailScreen() {
	const { productSlug, businessSlug } = useLocalSearchParams<{ productSlug: string; businessSlug: string }>()
	const router = useRouter()
	const { colors } = useTheme()
	const { translate, localize, currency, formatPrice } = useUser()
	const { setTabBarVisible } = useLayout()

	const [product, setProduct] = useState<ProductType | null>(null)
	const [viewer, setViewer] = useState<{ canEdit?: boolean; canCreate?: boolean } | null>(null)
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)

	// Section Edit Modes
	const [editMode, setEditMode] = useState({
		names: false,
		pricing: false,
		stock: false,
		specs: false,
		gallery: false
	})

	// Form States
	const [nameEn, setNameEn] = useState('')
	const [nameTnLatn, setNameTnLatn] = useState('')
	const [nameTnArab, setNameTnArab] = useState('')

	const [priceTND, setPriceTND] = useState('')
	const [unit, setUnit] = useState('kg')
	const [minUnit, setMinUnit] = useState('1')
	const [maxUnit, setMaxUnit] = useState('10')
	const [unitStep, setUnitStep] = useState('1')

	const [stockQuantity, setStockQuantity] = useState('0')
	const [minThreshold, setMinThreshold] = useState('5')
	const [uploadedGallery, setUploadedGallery] = useState<FileRef[]>([])
	const [uploadingPhoto, setUploadingPhoto] = useState(false)

	const [caliber, setCaliber] = useState<1 | 2 | 3 | 4 | 5>(3)
	const [harvest, setHarvest] = useState<'wild' | 'farm'>('farm')
	const [originStreet, setOriginStreet] = useState('')
	const [originCity, setOriginCity] = useState('Ellouza')
	const [originRegion, setOriginRegion] = useState('Sfax')
	const [originPostalCode, setOriginPostalCode] = useState('3016')
	const [originCountry, setOriginCountry] = useState('Tunisia')

	// Hide bottom tab bar
	useEffect(() => {
		setTabBarVisible(false)
		return () => {
			setTabBarVisible(true)
		}
	}, [setTabBarVisible])

	const syncProductToState = (prod: ProductType) => {
		setNameEn(prod.name?.en || '')
		setNameTnLatn(prod.name?.tn_latn || '')
		setNameTnArab(prod.name?.tn_arab || '')

		setPriceTND(prod.price?.total?.tnd?.toString() || '')
		setUnit(prod.unit?.measure || 'kg')
		setMinUnit(prod.unit?.min?.toString() || '1')
		setMaxUnit(prod.unit?.max?.toString() || '10')
		setUnitStep(prod.unit?.step?.toString() || '1')

		setStockQuantity(prod.stock?.quantity?.toString() || '0')
		setMinThreshold(prod.stock?.minThreshold?.toString() || '5')
		setUploadedGallery(prod.media?.gallery || [])

		setCaliber((prod.specs?.caliber as 1 | 2 | 3 | 4 | 5) || 3)
		setHarvest(prod.specs?.harvest || 'farm')
		setOriginStreet(prod.specs?.origin?.street || '')
		setOriginCity(prod.specs?.origin?.city || 'Ellouza')
		setOriginRegion(prod.specs?.origin?.region || 'Sfax')
		setOriginPostalCode(prod.specs?.origin?.postalCode || '3016')
		setOriginCountry(prod.specs?.origin?.country || 'Tunisia')
	}

	const loadProduct = useCallback(
		async (isRefresh = false) => {
			if (!productSlug) return

			try {
				if (!isRefresh) setLoading(true)
				setError(null)

				const response = await getProductBySlug(productSlug)
				setProduct(response.data)
				setViewer(response.viewer || null)
				syncProductToState(response.data)
			} catch (err) {
				const parsed = parseError(err)
				setError({
					title: parsed.title,
					message: parsed.message,
					type: parsed.type
				})
			} finally {
				setLoading(false)
				setRefreshing(false)
			}
		},
		[productSlug]
	)

	useEffect(() => {
		loadProduct()
	}, [loadProduct])

	const handleRefresh = () => {
		setRefreshing(true)
		loadProduct(true)
	}

	// ─── Save Actions ─────────────────────────────────────────────────────────────

	const saveNames = async () => {
		if (!nameEn.trim()) {
			toast.show({ title: translate('error', 'Error'), message: translate('err_enter_product_name', 'Please enter a product name (English)'), color: colors.error })
			return
		}
		try {
			setSaving(true)
			const res = await updateProduct(productSlug!, {
				name: {
					en: nameEn.trim(),
					tn_latn: nameTnLatn.trim() || undefined,
					tn_arab: nameTnArab.trim() || undefined
				}
			})
			setProduct(res.data)
			syncProductToState(res.data)
			setEditMode((prev) => ({ ...prev, names: false }))
			toast.show({ title: translate('success', 'Success'), message: translate('product_names_updated', 'Names updated successfully'), color: colors.success })
		} catch (err: any) {
			toast.show({ title: translate('error', 'Error'), message: err.message || translate('failed_to_update', 'Failed to update names'), color: colors.error })
		} finally {
			setSaving(false)
		}
	}

	const cancelNames = () => {
		if (product) {
			setNameEn(product.name?.en || '')
			setNameTnLatn(product.name?.tn_latn || '')
			setNameTnArab(product.name?.tn_arab || '')
		}
		setEditMode((prev) => ({ ...prev, names: false }))
	}

	const savePricing = async () => {
		const price = parseFloat(priceTND)
		if (isNaN(price) || price <= 0) {
			toast.show({ title: translate('validation_error', 'Validation Error'), message: translate('err_valid_price', 'Please enter a valid price'), color: colors.error })
			return
		}
		const minUnitNum = parseFloat(minUnit)
		if (isNaN(minUnitNum) || minUnitNum <= 0) {
			toast.show({ title: translate('validation_error', 'Validation Error'), message: translate('err_min_unit', 'Minimum unit must be greater than 0'), color: colors.error })
			return
		}
		const maxUnitNum = parseFloat(maxUnit)
		if (isNaN(maxUnitNum) || maxUnitNum <= 0) {
			toast.show({ title: translate('validation_error', 'Validation Error'), message: translate('err_max_unit', 'Maximum unit must be greater than 0'), color: colors.error })
			return
		}
		if (maxUnitNum < minUnitNum) {
			toast.show({ title: translate('validation_error', 'Validation Error'), message: translate('err_max_min', 'Maximum unit cannot be less than minimum unit'), color: colors.error })
			return
		}
		const stepUnitNum = parseFloat(unitStep)
		if (isNaN(stepUnitNum) || stepUnitNum <= 0) {
			toast.show({ title: translate('validation_error', 'Validation Error'), message: translate('err_unit_step', 'Unit step must be greater than 0'), color: colors.error })
			return
		}

		try {
			setSaving(true)
			const res = await updateProduct(productSlug!, {
				price: { total: { tnd: price } },
				unit: {
					measure: unit,
					min: minUnitNum,
					max: maxUnitNum,
					step: stepUnitNum
				}
			})
			setProduct(res.data)
			syncProductToState(res.data)
			setEditMode((prev) => ({ ...prev, pricing: false }))
			toast.show({ title: translate('success', 'Success'), message: translate('product_pricing_updated', 'Pricing updated successfully'), color: colors.success })
		} catch (err: any) {
			toast.show({ title: translate('error', 'Error'), message: err.message || translate('failed_to_update', 'Failed to update pricing'), color: colors.error })
		} finally {
			setSaving(false)
		}
	}

	const cancelPricing = () => {
		if (product) {
			setPriceTND(product.price?.total?.tnd?.toString() || '')
			setUnit(product.unit?.measure || 'kg')
			setMinUnit(product.unit?.min?.toString() || '1')
			setMaxUnit(product.unit?.max?.toString() || '10')
			setUnitStep(product.unit?.step?.toString() || '1')
		}
		setEditMode((prev) => ({ ...prev, pricing: false }))
	}

	const saveStock = async () => {
		const qty = parseInt(stockQuantity)
		if (isNaN(qty) || qty < 0) {
			toast.show({ title: translate('validation_error', 'Validation Error'), message: translate('err_stock_qty', 'Please enter a valid stock quantity'), color: colors.error })
			return
		}
		const threshold = parseInt(minThreshold)
		if (isNaN(threshold) || threshold < 0) {
			toast.show({ title: translate('validation_error', 'Validation Error'), message: translate('err_min_threshold', 'Please enter a valid threshold'), color: colors.error })
			return
		}

		try {
			setSaving(true)
			const res = await updateProduct(productSlug!, {
				stock: {
					quantity: qty,
					minThreshold: threshold
				}
			})
			setProduct(res.data)
			syncProductToState(res.data)
			setEditMode((prev) => ({ ...prev, stock: false }))
			toast.show({ title: translate('success', 'Success'), message: translate('product_stock_updated', 'Stock updated successfully'), color: colors.success })
		} catch (err: any) {
			toast.show({ title: translate('error', 'Error'), message: err.message || translate('failed_to_update', 'Failed to update stock'), color: colors.error })
		} finally {
			setSaving(false)
		}
	}

	const cancelStock = () => {
		if (product) {
			setStockQuantity(product.stock?.quantity?.toString() || '0')
			setMinThreshold(product.stock?.minThreshold?.toString() || '5')
		}
		setEditMode((prev) => ({ ...prev, stock: false }))
	}

	const saveSpecs = async () => {
		try {
			setSaving(true)
			const res = await updateProduct(productSlug!, {
				specs: {
					caliber,
					harvest,
					origin: {
						street: originStreet.trim() || undefined,
						city: originCity.trim() || undefined,
						region: originRegion.trim() || undefined,
						postalCode: originPostalCode.trim() || undefined,
						country: originCountry.trim() || undefined
					}
				}
			})
			setProduct(res.data)
			syncProductToState(res.data)
			setEditMode((prev) => ({ ...prev, specs: false }))
			toast.show({ title: translate('success', 'Success'), message: translate('product_specs_updated', 'Specifications updated successfully'), color: colors.success })
		} catch (err: any) {
			toast.show({ title: translate('error', 'Error'), message: err.message || translate('failed_to_update', 'Failed to update specifications'), color: colors.error })
		} finally {
			setSaving(false)
		}
	}

	const cancelSpecs = () => {
		if (product) {
			setCaliber((product.specs?.caliber as 1 | 2 | 3 | 4 | 5) || 3)
			setHarvest(product.specs?.harvest || 'farm')
			setOriginStreet(product.specs?.origin?.street || '')
			setOriginCity(product.specs?.origin?.city || 'Ellouza')
			setOriginRegion(product.specs?.origin?.region || 'Sfax')
			setOriginPostalCode(product.specs?.origin?.postalCode || '3016')
			setOriginCountry(product.specs?.origin?.country || 'Tunisia')
		}
		setEditMode((prev) => ({ ...prev, specs: false }))
	}

	const handleUploadPhoto = async () => {
		try {
			let DocumentPicker: any
			try {
				DocumentPicker = require('expo-document-picker')
			} catch (e) {
				toast.show({ title: translate('error', 'Error'), message: translate('err_no_doc_picker', 'Document picker is not available.'), color: colors.error })
				return
			}

			const remainingSlots = 5 - uploadedGallery.length
			if (remainingSlots <= 0) {
				toast.show({ title: translate('limit_reached', 'Limit Reached'), message: translate('err_max_photos', 'You can upload up to 5 photos.'), color: colors.warning })
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
				toast.show({
					title: translate('limit_notice', 'Limit Notice'),
					message: translate('err_max_photos_selected', 'Only the first {remaining} photos will be uploaded.').replace('{remaining}', String(remainingSlots)),
					color: colors.warning
				})
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
					toast.show({ title: translate('error', 'Error'), message: (uploadResult.error || translate('upload_failed', 'Failed to upload photo')) + `: ${file.name}`, color: colors.error })
				}
			}

			if (uploadedFiles.length > 0) {
				setUploadedGallery((prev) => [...prev, ...uploadedFiles])
				toast.show({ title: translate('success', 'Success'), message: translate('photo_uploaded', 'Photos uploaded successfully!'), color: colors.success })
			}
		} catch (error: any) {
			console.error('Error uploading photo:', error)
			toast.show({ title: translate('error', 'Error'), message: error.message || translate('failed_to_upload', 'Failed to upload photo'), color: colors.error })
		} finally {
			setUploadingPhoto(false)
		}
	}

	const saveGallery = async () => {
		try {
			setSaving(true)
			const res = await updateProduct(productSlug!, {
				media: {
					gallery: uploadedGallery.filter((img) => img._id !== 'thumb' && img._id !== 'thumbnail')
				}
			})
			setProduct(res.data)
			syncProductToState(res.data)
			setEditMode((prev) => ({ ...prev, gallery: false }))
			toast.show({ title: translate('success', 'Success'), message: translate('product_gallery_updated', 'Gallery updated successfully'), color: colors.success })
		} catch (err: any) {
			toast.show({ title: translate('error', 'Error'), message: err.message || translate('failed_to_update', 'Failed to update gallery'), color: colors.error })
		} finally {
			setSaving(false)
		}
	}

	const cancelGallery = () => {
		if (product) {
			setUploadedGallery(product.media?.gallery || [])
		}
		setEditMode((prev) => ({ ...prev, gallery: false }))
	}

	const handleToggleState = async () => {
		if (!product) return
		const currentState = product.state?.code || 'active'
		const newState = currentState === 'active' ? 'suspended' : 'active'
		try {
			setSaving(true)
			const res = await updateProduct(productSlug!, {
				state: { code: newState }
			})
			setProduct(res.data)
			syncProductToState(res.data)
			toast.show({
				title: translate('success', 'Success'),
				message: `${localize(product.name)} ${newState === 'active' ? translate('activated', 'activated') : translate('deactivated', 'deactivated')}`,
				color: colors.success
			})
		} catch (err: any) {
			toast.show({
				title: translate('error', 'Error'),
				message: err.message || translate('failed_to_update', 'Failed to update product status'),
				color: colors.error
			})
		} finally {
			setSaving(false)
		}
	}

	// ─── Layout Styles ─────────────────────────────────────────────────────────────

	const styles = useMemo(() => createStyles(colors), [colors])

	if (loading) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<Stack.Screen options={{ headerShown: false }} />
				<SmartHeader title={translate('loading', 'Loading...')} fallbackRoute={`/dashboard/${businessSlug}/products`} isLoading={true} />
				<LoadingState />
			</View>
		)
	}

	if (error || !product) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<Stack.Screen options={{ headerShown: false }} />
				<SmartHeader title={translate('error', 'Error')} fallbackRoute={`/dashboard/${businessSlug}/products`} />
				<ErrorState
					title={error?.type === 'network' ? undefined : error?.title || translate('product_not_found', 'Product Not Found')}
					message={error?.type === 'network' ? undefined : error?.message || translate('product_not_found_desc', 'The product could not be loaded.')}
					onRetry={error?.type === 'network' ? undefined : () => loadProduct()}
					iconOnly={error?.type === 'network'}
				/>
			</View>
		)
	}

	const displayTitle = localize(product.name)
	const imageUrl = product.media?.thumbnail?.url || product.defaultProduct?.media?.thumbnail?.url
	const productState = product.state?.code || 'active'
	const isProductActive = productState === 'active'
	const canEditProduct = viewer ? viewer.canEdit === true : true
	console.log('viewer:', viewer, 'canEditProduct:', canEditProduct)

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen options={{ headerShown: false }} />
			<SmartHeader title={displayTitle} fallbackRoute={`/dashboard/${businessSlug}/products` as any} />

			<KeyboardAvoidingView style={styles.form} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
				<SmartHeader.ScrollView
					style={styles.form}
					contentContainerStyle={[styles.formContent, styles.grow]}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					{saving && (
						<View style={styles.savingOverlay}>
							<ActivityIndicator size="small" color={colors.primary} />
							<Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginLeft: 8 }}>{translate('saving', 'Saving...')}</Text>
						</View>
					)}

					{/* Hero Banner Header */}
					<View style={styles.heroBanner}>
						<LinearGradient colors={[`${colors.primary}15`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
						<View style={styles.heroContent}>
							<View style={styles.avatarWrapper}>
								<SmartImage source={imageUrl} style={styles.avatarImage} entityType="product" />
							</View>
							<View style={styles.heroInfoText}>
								<Text style={styles.heroTitle}>{displayTitle}</Text>
								<View style={styles.heroBadgeRow}>
									<StateBadge stateCode={productState} />
									<TouchableOpacity
										style={[styles.statusToggleBtn, { borderColor: isProductActive ? colors.error + '40' : colors.success + '40' }]}
										onPress={handleToggleState}
										disabled={saving || !canEditProduct}
										activeOpacity={0.7}
									>
										<Text style={[styles.statusToggleText, { color: isProductActive ? colors.error : colors.success }]}>
											{isProductActive ? translate('suspend', 'Suspend') : translate('activate', 'Activate')}
										</Text>
									</TouchableOpacity>
								</View>
							</View>
						</View>
					</View>

					{/* Responsive Layout */}
					<View style={styles.responsiveLayoutContainer}>
						{/* Names Card */}
						<View style={styles.sectionCard}>
							<ProductNamesSection
								variant={editMode.names ? 'edit' : 'view'}
								colors={colors}
								translate={translate}
								nameEn={nameEn}
								setNameEn={setNameEn}
								nameTnLatn={nameTnLatn}
								setNameTnLatn={setNameTnLatn}
								nameTnArab={nameTnArab}
								setNameTnArab={setNameTnArab}
								productNameEn={product?.name?.en}
								productNameTnLatn={product?.name?.tn_latn}
								productNameTnArab={product?.name?.tn_arab}
								canEdit={canEditProduct}
								onEditPress={() => setEditMode((prev) => ({ ...prev, names: true }))}
								onSavePress={saveNames}
								onCancelPress={cancelNames}
							/>
						</View>

						{/* Gallery Card */}
						<View style={styles.sectionCard}>
							<ProductGallerySection
								editable={editMode.gallery && canEditProduct}
								gallery={uploadedGallery}
								colors={colors}
								translate={translate}
								onUploadPress={handleUploadPhoto}
								onRemovePress={(item) => setUploadedGallery((prev) => prev.filter((img) => img._id !== item._id))}
								uploading={uploadingPhoto}
								onEditPress={canEditProduct ? () => setEditMode((prev) => ({ ...prev, gallery: true })) : undefined}
								onSavePress={saveGallery}
								onCancelPress={cancelGallery}
							/>
						</View>

						{/* Pricing Card */}
						<View style={styles.sectionCard}>
							<ProductPricingSection
								variant={editMode.pricing ? 'edit' : 'view'}
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
								formattedPrice={product ? formatPrice({ total: { [currency]: product.price?.total?.[currency as keyof typeof product.price.total] || product.price?.total?.tnd || 0 } }) : ''}
								unitMeasure={product?.unit?.measure}
								minLimit={product?.unit?.min}
								maxLimit={product?.unit?.max}
								canEdit={canEditProduct}
								onEditPress={() => setEditMode((prev) => ({ ...prev, pricing: true }))}
								onSavePress={savePricing}
								onCancelPress={cancelPricing}
							/>
						</View>

						{/* Stock Card */}
						<View style={styles.sectionCard}>
							<ProductStockSection
								variant={editMode.stock ? 'edit' : 'view'}
								colors={colors}
								translate={translate}
								stockQuantity={stockQuantity}
								setStockQuantity={setStockQuantity}
								minThreshold={minThreshold}
								setMinThreshold={setMinThreshold}
								stockQuantityVal={product?.stock?.quantity || 0}
								minThresholdVal={product?.stock?.minThreshold || 5}
								canEdit={canEditProduct}
								onEditPress={() => setEditMode((prev) => ({ ...prev, stock: true }))}
								onSavePress={saveStock}
								onCancelPress={cancelStock}
							/>
						</View>

						{/* Specifications Card */}
						<ProductSpecsSection
							editable={editMode.specs && canEditProduct}
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
							originPostalCode={originPostalCode}
							setOriginPostalCode={setOriginPostalCode}
							originCountry={originCountry}
							setOriginCountry={setOriginCountry}
							specs={product.specs}
							onEdit={canEditProduct ? () => setEditMode((prev) => ({ ...prev, specs: true })) : undefined}
							onSavePress={saveSpecs}
							onCancelPress={cancelSpecs}
						/>
					</View>
				</SmartHeader.ScrollView>
			</KeyboardAvoidingView>
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
			maxWidth: 1200,
			padding: 16,
			paddingBottom: 80
		},
		grow: {
			flexGrow: 1
		},
		heroBanner: {
			height: 160,
			marginHorizontal: -16,
			marginTop: -16,
			marginBottom: 24,
			paddingHorizontal: 24,
			justifyContent: 'flex-end',
			paddingBottom: 24,
			borderBottomWidth: 1.5,
			borderColor: colors.borderLight,
			backgroundColor: colors.surface
		},
		heroContent: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 16
		},
		avatarWrapper: {
			width: 80,
			height: 80,
			borderRadius: 22,
			borderWidth: 2,
			borderColor: colors.primary,
			backgroundColor: colors.background,
			overflow: 'hidden'
		},
		avatarImage: {
			width: '100%',
			height: '100%'
		},
		heroInfoText: {
			flex: 1,
			justifyContent: 'center'
		},
		heroTitle: {
			fontSize: 22,
			fontWeight: '800',
			color: colors.text,
			letterSpacing: -0.5,
			marginBottom: 8
		},
		heroBadgeRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 12
		},
		statusToggleBtn: {
			paddingHorizontal: 10,
			paddingVertical: 4,
			borderRadius: 8,
			borderWidth: 1.5,
			backgroundColor: 'transparent'
		},
		statusToggleText: {
			fontSize: 11,
			fontWeight: '700',
			textTransform: 'uppercase',
			letterSpacing: 0.5
		},
		savingOverlay: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8,
			paddingVertical: 10,
			paddingHorizontal: 16,
			borderRadius: 12,
			backgroundColor: colors.primary + '12',
			marginBottom: 16,
			alignSelf: 'center'
		},
		responsiveLayoutContainer: {
			width: '100%',
			gap: 16,
			flexDirection: 'column'
		},
		sectionCard: {
			backgroundColor: colors.card,
			borderRadius: 24,
			borderWidth: 1.5,
			borderColor: colors.borderLight,
			padding: 20,
			...Platform.select({
				ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
				android: { elevation: 2 }
			})
		}
	})
