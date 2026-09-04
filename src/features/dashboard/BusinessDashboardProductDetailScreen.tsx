import { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, Platform, KeyboardAvoidingView, RefreshControl } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useTheme } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import { useLayout } from '@/core/contexts/LayoutContext'
import { getProductBySlug, updateProduct } from '@/features/products/products.api'
import { ProductType, FileRef } from '@/features/products/products.type'
import type { MultiLang } from '@/features/common/address'
import { MultiLingualCard } from '@/core/ui/languages/MultiLingualCard'
import ProductPricingCard from '@/features/products/cards/ProductPricingCard'
import ProductStockSection from '@/features/products/common/ProductStockSection'
import ProductSpecsSection from '@/features/products/common/ProductSpecsSection'
import ErrorBlock from '@/core/error/ErrorBlock'
import Spinner from '@/features/common/Spinner'
import { SmartHeader } from '@/core/smart-header'
import { SmartMediaView, deleteMediaFile } from '@/core/smart-media'
import { CarouselCard } from '@/core/smart-media/carousel-card'
import StateBadge from '@/features/common/StateBadge'
import { IconBaseButton } from '@/core/ui/buttons/IconBaseButton'
import { toast } from '@/features/common/Toast'
import { parseError } from '@/core/error/errorHandler'
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
	const [singlePieceMinWeightKg, setSinglePieceMinWeightKg] = useState('')
	const [singlePieceAvgWeightKg, setSinglePieceAvgWeightKg] = useState('')
	const [singlePieceMaxWeightKg, setSinglePieceMaxWeightKg] = useState('')
	const [stockQuantity, setStockQuantity] = useState('0')
	const [minThreshold, setMinThreshold] = useState('5')
	const [uploadedGallery, setUploadedGallery] = useState<FileRef[]>([])
	const [removedFiles, setRemovedFiles] = useState<FileRef[]>([])
	const [caliber, setCaliber] = useState<1 | 2 | 3 | 4 | 5>(3)
	const [harvest, setHarvest] = useState<'wild' | 'farm'>('farm')
	const [originStreet, setOriginStreet] = useState<MultiLang>({ en: '', tn_latn: '', tn_arab: '' })
	const [originCity, setOriginCity] = useState('Ellouza')
	const [originRegion, setOriginRegion] = useState('Sfax')
	const [originCountry, setOriginCountry] = useState('Tunisia')
	const [gear, setGear] = useState<'trap' | 'gillnet' | undefined>(undefined)
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
		setSinglePieceMinWeightKg(prod.unit?.singlePiece?.minWeightKg?.toString() || '')
		setSinglePieceAvgWeightKg(prod.unit?.singlePiece?.avgWeightKg?.toString() || '')
		setSinglePieceMaxWeightKg(prod.unit?.singlePiece?.maxWeightKg?.toString() || '')
		setStockQuantity(prod.stock?.quantity?.toString() || '0')
		setMinThreshold(prod.stock?.minThreshold?.toString() || '5')
		setUploadedGallery(prod.media?.gallery || [])
		setCaliber((prod.specs?.caliber as 1 | 2 | 3 | 4 | 5) || 3)
		setHarvest(prod.specs?.harvest || 'farm')
		setOriginStreet(
			prod.specs?.origin?.street
				? {
						en: (prod.specs.origin.street as MultiLang).en || '',
						tn_latn: (prod.specs.origin.street as MultiLang).tn_latn || '',
						tn_arab: (prod.specs.origin.street as MultiLang).tn_arab || ''
					}
				: { en: '', tn_latn: '', tn_arab: '' }
		)
		setOriginCity(prod.specs?.origin?.city || 'Ellouza')
		setOriginRegion(prod.specs?.origin?.region || 'Sfax')
		setOriginCountry(prod.specs?.origin?.country || 'Tunisia')
		setGear(prod.specs?.gear)
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
			toast.show({ title: translate('error', 'Error'), content: translate('err_enter_product_name', 'Please enter a product name (English)'), borderColor: colors.error })
			return
		}
		try {
			setSaving(true)
			const enName = nameEn.trim()
			const res = await updateProduct(productSlug!, {
				name: {
					en: enName,
					tn_latn: nameTnLatn.trim() || enName,
					tn_arab: nameTnArab.trim() || enName
				}
			})
			setProduct(res.data)
			syncProductToState(res.data)
			setEditMode((prev) => ({ ...prev, names: false }))
			toast.show({ title: translate('success', 'Success'), content: translate('product_names_updated', 'Names updated successfully'), borderColor: colors.success })
		} catch (err: any) {
			toast.show({ title: translate('error', 'Error'), content: err.message || translate('failed_to_update', 'Failed to update names'), borderColor: colors.error })
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
			toast.show({ title: translate('validation_error', 'Validation Error'), content: translate('err_valid_price', 'Please enter a valid price'), borderColor: colors.error })
			return
		}
		const minUnitNum = parseFloat(minUnit)
		if (isNaN(minUnitNum) || minUnitNum <= 0) {
			toast.show({ title: translate('validation_error', 'Validation Error'), content: translate('err_min_unit', 'Minimum unit must be greater than 0'), borderColor: colors.error })
			return
		}
		const maxUnitNum = parseFloat(maxUnit)
		if (isNaN(maxUnitNum) || maxUnitNum <= 0) {
			toast.show({ title: translate('validation_error', 'Validation Error'), content: translate('err_max_unit', 'Maximum unit must be greater than 0'), borderColor: colors.error })
			return
		}
		if (maxUnitNum < minUnitNum) {
			toast.show({ title: translate('validation_error', 'Validation Error'), content: translate('err_max_min', 'Maximum unit cannot be less than minimum unit'), borderColor: colors.error })
			return
		}
		const stepUnitNum = parseFloat(unitStep)
		if (isNaN(stepUnitNum) || stepUnitNum <= 0) {
			toast.show({ title: translate('validation_error', 'Validation Error'), content: translate('err_unit_step', 'Unit step must be greater than 0'), borderColor: colors.error })
			return
		}
		const minW = singlePieceMinWeightKg ? parseFloat(singlePieceMinWeightKg) : NaN
		const avgW = singlePieceAvgWeightKg ? parseFloat(singlePieceAvgWeightKg) : NaN
		const maxW = singlePieceMaxWeightKg ? parseFloat(singlePieceMaxWeightKg) : NaN
		if ((!isNaN(minW) && minW <= 0) || (!isNaN(avgW) && avgW <= 0) || (!isNaN(maxW) && maxW <= 0)) {
			toast.show({ title: translate('validation_error', 'Validation Error'), content: translate('err_weight_positive', 'Single piece weights must be greater than 0'), borderColor: colors.error })
			return
		}
		if ((!isNaN(maxW) && !isNaN(minW) && maxW < minW) || (!isNaN(maxW) && !isNaN(avgW) && maxW < avgW) || (!isNaN(avgW) && !isNaN(minW) && avgW < minW)) {
			toast.show({ title: translate('validation_error', 'Validation Error'), content: translate('err_weight_range', 'Max weight ≥ avg weight ≥ min weight'), borderColor: colors.error })
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
					step: stepUnitNum,
					singlePiece: [singlePieceMinWeightKg, singlePieceAvgWeightKg, singlePieceMaxWeightKg].some((v) => v.trim().length > 0)
						? {
								minWeightKg: singlePieceMinWeightKg ? parseFloat(singlePieceMinWeightKg) : undefined,
								avgWeightKg: singlePieceAvgWeightKg ? parseFloat(singlePieceAvgWeightKg) : undefined,
								maxWeightKg: singlePieceMaxWeightKg ? parseFloat(singlePieceMaxWeightKg) : undefined
							}
						: undefined
				}
			})
			setProduct(res.data)
			syncProductToState(res.data)
			setEditMode((prev) => ({ ...prev, pricing: false }))
			toast.show({ title: translate('success', 'Success'), content: translate('product_pricing_updated', 'Pricing updated successfully'), borderColor: colors.success })
		} catch (err: any) {
			toast.show({ title: translate('error', 'Error'), content: err.message || translate('failed_to_update', 'Failed to update pricing'), borderColor: colors.error })
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
			setSinglePieceMinWeightKg(product.unit?.singlePiece?.minWeightKg?.toString() || '')
			setSinglePieceAvgWeightKg(product.unit?.singlePiece?.avgWeightKg?.toString() || '')
			setSinglePieceMaxWeightKg(product.unit?.singlePiece?.maxWeightKg?.toString() || '')
		}
		setEditMode((prev) => ({ ...prev, pricing: false }))
	}
	const saveStock = async () => {
		const qty = parseInt(stockQuantity)
		if (isNaN(qty) || qty < 0) {
			toast.show({ title: translate('validation_error', 'Validation Error'), content: translate('err_stock_qty', 'Please enter a valid stock quantity'), borderColor: colors.error })
			return
		}
		const threshold = parseInt(minThreshold)
		if (isNaN(threshold) || threshold < 0) {
			toast.show({ title: translate('validation_error', 'Validation Error'), content: translate('err_min_threshold', 'Please enter a valid threshold'), borderColor: colors.error })
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
			toast.show({ title: translate('success', 'Success'), content: translate('product_stock_updated', 'Stock updated successfully'), borderColor: colors.success })
		} catch (err: any) {
			toast.show({ title: translate('error', 'Error'), content: err.message || translate('failed_to_update', 'Failed to update stock'), borderColor: colors.error })
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
					gear,
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
				}
			})
			setProduct(res.data)
			syncProductToState(res.data)
			setEditMode((prev) => ({ ...prev, specs: false }))
			toast.show({ title: translate('success', 'Success'), content: translate('product_specs_updated', 'Specifications updated successfully'), borderColor: colors.success })
		} catch (err: any) {
			toast.show({ title: translate('error', 'Error'), content: err.message || translate('failed_to_update', 'Failed to update specifications'), borderColor: colors.error })
		} finally {
			setSaving(false)
		}
	}
	const cancelSpecs = () => {
		if (product) {
			setCaliber((product.specs?.caliber as 1 | 2 | 3 | 4 | 5) || 3)
			setHarvest(product.specs?.harvest || 'farm')
			const s = product.specs?.origin?.street as unknown as MultiLang | undefined
			setOriginStreet(s ? { en: s.en || '', tn_latn: s.tn_latn || '', tn_arab: s.tn_arab || '' } : { en: '', tn_latn: '', tn_arab: '' })
			setOriginCity(product.specs?.origin?.city || 'Ellouza')
			setOriginRegion(product.specs?.origin?.region || 'Sfax')
			setOriginCountry(product.specs?.origin?.country || 'Tunisia')
			setGear(product.specs?.gear)
		}
		setEditMode((prev) => ({ ...prev, specs: false }))
	}
	const handleRemoveGalleryItem = (item: FileRef) => {
		setUploadedGallery((prev) => prev.filter((img) => img._id !== item._id))
		if (item._id && !item._id.startsWith('pending-')) {
			setRemovedFiles((prev) => [...prev, item])
		}
	}
	const saveGallery = async () => {
		try {
			setSaving(true)
			if (removedFiles.length > 0) {
				await Promise.allSettled(removedFiles.map((file) => deleteMediaFile(file._id!)))
				setRemovedFiles([])
			}
			const res = await updateProduct(productSlug!, {
				media: {
					gallery: uploadedGallery.filter((img) => img._id !== 'thumb' && img._id !== 'thumbnail')
				}
			})
			setProduct(res.data)
			syncProductToState(res.data)
			setEditMode((prev) => ({ ...prev, gallery: false }))
			toast.show({ title: translate('success', 'Success'), content: translate('product_gallery_updated', 'Gallery updated successfully'), borderColor: colors.success })
		} catch (err: any) {
			toast.show({ title: translate('error', 'Error'), content: err.message || translate('failed_to_update', 'Failed to update gallery'), borderColor: colors.error })
		} finally {
			setSaving(false)
		}
	}
	const cancelGallery = () => {
		if (product) {
			setUploadedGallery(product.media?.gallery || [])
		}
		setRemovedFiles([])
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
				content: `${localize(product.name)} ${newState === 'active' ? translate('activated', 'activated') : translate('deactivated', 'deactivated')}`,
				borderColor: colors.success
			})
		} catch (err: any) {
			toast.show({
				title: translate('error', 'Error'),
				content: err.message || translate('failed_to_update', 'Failed to update product status'),
				borderColor: colors.error
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
				<SmartHeader fallbackRoute={`/dashboard/${businessSlug}/products`} />
				<Spinner />
			</View>
		)
	}
	if (error || !product) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<Stack.Screen options={{ headerShown: false }} />
				<SmartHeader title={translate('error', 'Error')} fallbackRoute={`/dashboard/${businessSlug}/products`} />
				<ErrorBlock onRetry={() => loadProduct()} />
			</View>
		)
	}
	const displayTitle = localize(product.name)
	const imageUrl = product.media?.thumbnail?.url || product.defaultProduct?.media?.thumbnail?.url
	const productState = product.state?.code || 'active'
	const isProductActive = productState === 'active'
	const canEditProduct = viewer ? viewer.canEdit === true : true
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
					{saving && <Spinner size="small" expand={false} style={styles.savingOverlay} />}
					{/* Hero Banner Header */}
					<View style={styles.heroBanner}>
						<LinearGradient colors={[`${colors.primary}15`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
						<View style={styles.heroContent}>
							<View style={styles.avatarWrapper}>
								<SmartMediaView media={imageUrl} style={styles.avatarImage} />
							</View>
							<View style={styles.heroInfoText}>
								<Text style={styles.heroTitle}>{displayTitle}</Text>
								<View style={styles.heroBadgeRow}>
									<StateBadge stateCode={productState} />
									<IconBaseButton
										icon={isProductActive ? 'pause-circle-outline' : 'play-circle-outline'}
										label={isProductActive ? translate('suspend', 'Suspend') : translate('activate', 'Activate')}
										onPress={handleToggleState}
										disabled={saving || !canEditProduct}
										variant={isProductActive ? 'danger' : 'success'}
									/>
								</View>
							</View>
						</View>
					</View>
					{/* Responsive Layout */}
					<View style={styles.responsiveLayoutContainer}>
						{/* Names Card */}
						<View style={styles.sectionCard}>
							<MultiLingualCard
								name={editMode.names ? ({ en: nameEn, tn_latn: nameTnLatn, tn_arab: nameTnArab } as any) : (product?.name as any)}
								isEditing={editMode.names}
								onEdit={canEditProduct ? () => setEditMode((prev) => ({ ...prev, names: true })) : (undefined as any)}
								onSave={saveNames}
								onCancel={cancelNames}
								onChange={(lang, value) => {
									if (lang === 'en') setNameEn(value)
									else if (lang === 'tn_latn') setNameTnLatn(value)
									else if (lang === 'tn_arab') setNameTnArab(value)
								}}
							/>
						</View>
						{/* Gallery Card — replaced by CarouselCard */}
						<View style={styles.sectionCard}>
							<CarouselCard
								media={
									{
										thumbnail: null as any,
										gallery: [(product as any).media?.thumbnail, ...uploadedGallery].filter((f: any) => f && (f.url || f.secure_url)) as any
									} as any
								}
								targetModelName="products"
								targetModelId={product._id}
								title={translate('gallery', 'Gallery')}
								mode={canEditProduct ? (editMode.gallery ? 'edit' : 'editable') : 'view'}
								mediaType="mixed"
								onEdit={() => setEditMode((prev) => ({ ...prev, gallery: true }))}
								onSave={saveGallery}
								onCancel={cancelGallery}
								onChange={(next) => {
									// next includes thumbnail + gallery; strip thumbnail back to gallery-only for API
									const thumbId = (product as any).media?.thumbnail?._id
									const filtered = (next as any[]).filter((f: any) => f._id !== thumbId && f._id !== 'thumbnail')
									setUploadedGallery(filtered as any)
								}}
								onRemove={handleRemoveGalleryItem}
								loading={saving}
							/>
						</View>
						{/* Pricing Card */}
						<View style={styles.sectionCard}>
							<ProductPricingCard
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
								singlePieceMinWeightKg={singlePieceMinWeightKg}
								setSinglePieceMinWeightKg={setSinglePieceMinWeightKg}
								singlePieceAvgWeightKg={singlePieceAvgWeightKg}
								setSinglePieceAvgWeightKg={setSinglePieceAvgWeightKg}
								singlePieceMaxWeightKg={singlePieceMaxWeightKg}
								setSinglePieceMaxWeightKg={setSinglePieceMaxWeightKg}
								formattedPrice={product ? formatPrice({ total: { [currency]: product.price?.total?.[currency as keyof typeof product.price.total] || product.price?.total?.tnd || 0 } }) : ''}
								unitMeasure={product?.unit?.measure}
								minLimit={product?.unit?.min}
								maxLimit={product?.unit?.max}
								singlePieceMin={product?.unit?.singlePiece?.minWeightKg}
								singlePieceAvg={product?.unit?.singlePiece?.avgWeightKg}
								singlePieceMax={product?.unit?.singlePiece?.maxWeightKg}
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
							originCountry={originCountry}
							setOriginCountry={setOriginCountry}
							gear={gear}
							setGear={setGear}
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
			borderColor: colors.border,
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
		headerActions: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 12
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
			backgroundColor: colors.background,
			borderRadius: 24,
			borderWidth: 1.5,
			borderColor: colors.border,
			padding: 20
		}
	})
