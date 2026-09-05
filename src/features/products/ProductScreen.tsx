import { useEffect, useState, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, RefreshControl, TouchableOpacity, useWindowDimensions, AppState, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router'
import { getItem, setItem } from '@storage'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { useTheme, themeColors, getCarouselPreviewHeight, getResponsiveCardHeight } from '@theme'
import { useUser, useLayout } from '@contexts'
import { isWeb } from '@platform'
import { updateProduct } from '@products/products.api'
import { useProductBySlug } from './useProductBySlug'
import { ProductType, FileRef } from '@products/products.type'
import { MultiLang, formatAddress } from '@address'
import { MultiLingualCard } from '@languages'
import ProductPricingCard from '@products/cards/ProductPricingCard'
import { CheckoutCard } from '@products/cards/CheckoutCard'
import { StockCard } from '@products/stock'
import { ProductStockSection, ProductSpecsSection } from '@products/common'
import ErrorBlock from '@error/ErrorBlock'
import { Spinner } from '@spinner'
import { PhoneButton, WhatsAppButton, EmailButton, WebsiteButton, DirectionsButton } from '@buttons'
import { SmartMediaView, deleteMediaFile, CarouselCard } from '@smart-media'
import { toast } from '@toast'
import { useScrollHandler } from '@scroll'
import ReviewSection from '@reviews/Reviews'
import QRCodeModal from '@ui/qrcode/QRCodeModal'
import { HeaderQRCodeButton, HeaderRefreshButton, SmartHeader } from '@smart-header'
import { config } from '@config'
export default function ProductScreen() {
	const { productSlug } = useLocalSearchParams<{ productSlug: string }>()
	const router = useRouter()
	const { colors } = useTheme()
	const { localize, translate, currency, formatPrice, user } = useUser()
	const { onScroll } = useScrollHandler()
	const { setTabBarVisible, headerHeight } = useLayout()
	const { width, height } = useWindowDimensions()
	const insets = useSafeAreaInsets()
	const [isScreenFocused, setIsScreenFocused] = useState(true)
	useFocusEffect(
		useCallback(() => {
			setIsScreenFocused(true)
			return () => setIsScreenFocused(false)
		}, [])
	)
	useEffect(() => {
		const sub = AppState.addEventListener('change', (next) => {
			if (next !== 'active') setIsScreenFocused(false)
			else setIsScreenFocused(true)
		})
		return () => sub.remove()
	}, [])
	const { data: productResponse, isInitialLoading, isRefreshing, isOffline, refresh, updateCache } = useProductBySlug({ productSlug })
	const product = productResponse?.data ?? null
	const viewer = productResponse?.viewer ?? null
	const [activeImage, setActiveImage] = useState<string | null>(null)
	const [cart, setCart] = useState<any[]>([])
	const [quantity, setQuantity] = useState(1)
	const [showQRCode, setShowQRCode] = useState(false)
	const [saving, setSaving] = useState(false)
	const [editMode, setEditMode] = useState({
		names: false,
		pricing: false,
		stock: false,
		gallery: false,
		specs: false
	})
	const carouselMedia = useMemo(() => {
		if (!product) return null
		const rawMedia = (product as any).media as any
		const hasThumb = !!(rawMedia?.thumbnail && (rawMedia.thumbnail as any).url)
		const hasGallery = Array.isArray(rawMedia?.gallery) && rawMedia.gallery.length > 0
		if (hasThumb || hasGallery) return rawMedia
		const fallbackThumb = (product as any).defaultProduct?.media?.thumbnail
		if (fallbackThumb?.url) return { thumbnail: fallbackThumb, gallery: [] } as any
		return (rawMedia as any) ?? null
	}, [product])
	// Names
	const [nameEn, setNameEn] = useState('')
	const [nameTnLatn, setNameTnLatn] = useState('')
	const [nameTnArab, setNameTnArab] = useState('')
	// Pricing
	const [priceTND, setPriceTND] = useState('')
	const [unit, setUnit] = useState('kg')
	const [minUnit, setMinUnit] = useState('1')
	const [maxUnit, setMaxUnit] = useState('10')
	const [unitStep, setUnitStep] = useState('1')
	const [singlePieceMinWeightKg, setSinglePieceMinWeightKg] = useState('')
	const [singlePieceAvgWeightKg, setSinglePieceAvgWeightKg] = useState('')
	const [singlePieceMaxWeightKg, setSinglePieceMaxWeightKg] = useState('')
	// Stock
	const [stockQuantity, setStockQuantity] = useState('0')
	const [minThreshold, setMinThreshold] = useState('10')
	// Gallery
	// Gallery
	const [uploadedGallery, setUploadedGallery] = useState<FileRef[]>([])
	const [removedFiles, setRemovedFiles] = useState<FileRef[]>([])
	// Specs
	const [caliber, setCaliber] = useState<1 | 2 | 3 | 4 | 5>(3)
	const [harvest, setHarvest] = useState<'wild' | 'farm'>('farm')
	const [originStreet, setOriginStreet] = useState<MultiLang>({ en: '', tn_latn: '', tn_arab: '' })
	const [originCity, setOriginCity] = useState('')
	const [originRegion, setOriginRegion] = useState('')
	const [originCountry, setOriginCountry] = useState('')
	const [gear, setGear] = useState<'trap' | 'gillnet' | undefined>(undefined)
	const displayTitle = product ? localize(product.name) : ''
	const isWide = width >= 900 || (width > height && width >= 700)
	const isLargeScreen = isWide
	const canEditProduct = viewer ? viewer.canEdit === true : false
	const carouselMaxHeight = useMemo(() => {
		if (!isLargeScreen) return undefined
		return getResponsiveCardHeight(height, 56, insets.top, insets.bottom)
	}, [isLargeScreen, height, insets.top, insets.bottom])
	const carouselPreviewHeight = useMemo(() => {
		if (!isLargeScreen || !carouselMaxHeight) return undefined
		return getCarouselPreviewHeight(carouselMaxHeight)
	}, [isLargeScreen, carouselMaxHeight])
	const syncProductToState = useCallback((prod: ProductType) => {
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
		setMinThreshold(prod.stock?.minThreshold?.toString() || '10')
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
		setOriginCity(prod.specs?.origin?.city || '')
		setOriginRegion(prod.specs?.origin?.region || '')
		setOriginCountry(prod.specs?.origin?.country || '')
		setGear(prod.specs?.gear)
	}, [])
	useEffect(() => {
		if (product?.unit?.min != null && product?.unit?.step != null) {
			setQuantity(product.unit.min * product.unit.step)
		}
	}, [product])
	const increment = () => {
		if (!product) return
		const step = product.unit?.step || 1
		const maxQuantity = product.unit?.max ? product.unit.max * step : Infinity
		const stockQty = product.stock?.quantity || 0
		setQuantity((prev) => {
			const next = Math.round((prev + step) * 100) / 100
			return next <= maxQuantity && next <= stockQty ? next : prev
		})
	}
	const decrement = () => {
		if (!product) return
		const step = product.unit?.step || 1
		const minQty = product.unit?.min ? product.unit.min * step : step
		setQuantity((prev) => {
			const next = Math.round((prev - step) * 100) / 100
			return next >= minQty ? next : minQty
		})
	}
	const handleAddToCart = async () => {
		if (!product) return
		try {
			const existing = cart.findIndex((b) => b._id === product._id)
			const newCart = existing > -1 ? cart.map((b, i) => (i === existing ? { ...b, quantity: b.quantity + quantity } : b)) : [...cart, { ...product, quantity }]
			setCart(newCart)
			await setItem('cart', newCart)
			toast.show({
				title: 'Success',
				content: `${localize(product.name)} ${translate('cart_added_to_cart', 'added to cart')}`,
				borderColor: themeColors.success,
				screen: user ? '/purchases?status=cart' : '/auth'
			})
		} catch {
			toast.show({ title: 'Error', content: translate('cart_failed_to_add', 'Failed to add to cart'), borderColor: themeColors.error })
		}
	}
	const loadCart = async () => {
		try {
			const saved = await getItem<any[]>('cart')
			if (saved) setCart(saved)
		} catch {}
	}
	useEffect(() => {
		setTabBarVisible(false)
		return () => {
			setTabBarVisible(true)
		}
	}, [setTabBarVisible])
	useEffect(() => {
		if (product) {
			syncProductToState(product)
		}
	}, [product, syncProductToState])
	const handleRefresh = () => {
		refresh()
		loadCart()
	}
	useEffect(() => {
		loadCart()
	}, [])
	// ─── Save Actions ─────────────────────────────────────────────────────────────
	const saveNames = async () => {
		if (!canEditProduct) return
		try {
			setSaving(true)
			const enName = nameEn.trim() || product?.name?.en || ''
			const res = await updateProduct(productSlug!, {
				name: {
					en: enName,
					tn_latn: nameTnLatn.trim() || enName,
					tn_arab: nameTnArab.trim() || enName
				}
			})
			if (productResponse) {
				updateCache({ ...productResponse, data: res.data })
			} else {
				refresh()
			}
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
		if (product) syncProductToState(product)
		setEditMode((prev) => ({ ...prev, names: false }))
	}
	const savePricing = async () => {
		if (!canEditProduct) return
		try {
			setSaving(true)
			const minW = singlePieceMinWeightKg ? parseFloat(singlePieceMinWeightKg) : NaN
			const avgW = singlePieceAvgWeightKg ? parseFloat(singlePieceAvgWeightKg) : NaN
			const maxW = singlePieceMaxWeightKg ? parseFloat(singlePieceMaxWeightKg) : NaN
			if ((!isNaN(minW) && minW <= 0) || (!isNaN(avgW) && avgW <= 0) || (!isNaN(maxW) && maxW <= 0)) {
				toast.show({ title: translate('validation_error', 'Validation Error'), content: translate('err_weight_positive', 'Single piece weights must be greater than 0'), borderColor: colors.error })
				setSaving(false)
				return
			}
			if ((!isNaN(maxW) && !isNaN(minW) && maxW < minW) || (!isNaN(maxW) && !isNaN(avgW) && maxW < avgW) || (!isNaN(avgW) && !isNaN(minW) && avgW < minW)) {
				toast.show({ title: translate('validation_error', 'Validation Error'), content: translate('err_weight_range', 'Max weight ≥ avg weight ≥ min weight'), borderColor: colors.error })
				setSaving(false)
				return
			}
			const res = await updateProduct(productSlug!, {
				price: {
					total: {
						tnd: priceTND ? parseFloat(priceTND) : 0
					}
				},
				unit: {
					measure: unit,
					min: minUnit ? parseFloat(minUnit) : 1,
					max: maxUnit ? parseFloat(maxUnit) : 10,
					step: unitStep ? parseFloat(unitStep) : 1,
					singlePiece: [singlePieceMinWeightKg, singlePieceAvgWeightKg, singlePieceMaxWeightKg].some((v) => v.trim().length > 0)
						? {
								minWeightKg: singlePieceMinWeightKg ? parseFloat(singlePieceMinWeightKg) : undefined,
								avgWeightKg: singlePieceAvgWeightKg ? parseFloat(singlePieceAvgWeightKg) : undefined,
								maxWeightKg: singlePieceMaxWeightKg ? parseFloat(singlePieceMaxWeightKg) : undefined
							}
						: undefined
				}
			})
			if (productResponse) {
				updateCache({ ...productResponse, data: res.data })
			} else {
				refresh()
			}
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
		if (product) syncProductToState(product)
		setEditMode((prev) => ({ ...prev, pricing: false }))
	}
	const saveStock = async () => {
		if (!canEditProduct) return
		try {
			setSaving(true)
			const res = await updateProduct(productSlug!, {
				stock: {
					quantity: stockQuantity ? parseFloat(stockQuantity) : 0,
					minThreshold: minThreshold ? parseFloat(minThreshold) : 10
				}
			})
			if (productResponse) {
				updateCache({ ...productResponse, data: res.data })
			} else {
				refresh()
			}
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
		if (product) syncProductToState(product)
		setEditMode((prev) => ({ ...prev, stock: false }))
	}
	const handleRemoveGalleryItem = (item: FileRef) => {
		setUploadedGallery((prev) => prev.filter((img) => img._id !== item._id))
		if (item._id && !item._id.startsWith('pending-')) {
			setRemovedFiles((prev) => [...prev, item])
		}
	}
	const saveGallery = async () => {
		if (!canEditProduct) return
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
			if (productResponse) {
				updateCache({ ...productResponse, data: res.data })
			} else {
				refresh()
			}
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
		if (product) syncProductToState(product)
		setRemovedFiles([])
		setEditMode((prev) => ({ ...prev, gallery: false }))
	}
	const saveSpecs = async () => {
		if (!canEditProduct) return
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
			if (productResponse) {
				updateCache({ ...productResponse, data: res.data })
			} else {
				refresh()
			}
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
		if (product) syncProductToState(product)
		setEditMode((prev) => ({ ...prev, specs: false }))
	}
	const handleBusinessNavPress = () => {
		if (product?.business?.slug) {
			router.push(`/businesses/${product.business.slug}` as any)
		}
	}
	const headerActions = useMemo(
		() => [<HeaderQRCodeButton key="qr-code" onPress={() => setShowQRCode(true)} />, <HeaderRefreshButton key="refresh" onRefresh={handleRefresh} isRefreshing={isRefreshing} />],
		[handleRefresh, isRefreshing]
	)
	const combinedGallery = useMemo(() => {
		if (!product) return []
		const list: FileRef[] = []
		const thumb = (product as any).media?.thumbnail as FileRef | undefined
		const fallbackThumb = (product as any).defaultProduct?.media?.thumbnail as FileRef | undefined
		const thumbToUse = thumb || fallbackThumb
		if (thumbToUse && (thumbToUse.url || (thumbToUse as any).secure_url)) {
			list.push(thumbToUse)
		}
		if (product.media?.gallery) {
			product.media.gallery.forEach((item) => {
				const isDuplicate = item._id === thumbToUse?._id || (item.url === thumbToUse?.url && (item as any).secure_url === (thumbToUse as any)?.secure_url)
				if (!isDuplicate) list.push(item)
			})
		}
		return list
	}, [product])
	const renderMediaCarousel = useCallback(() => {
		if (!product) return null
		return (
			<CarouselCard
				media={carouselMedia as any}
				targetModelName="products"
				targetModelId={product._id}
				title={translate('media', 'Media')}
				mode={canEditProduct ? (editMode.gallery ? 'form' : 'edit') : 'view'}
				onEdit={() => setEditMode((prev) => ({ ...prev, gallery: true }))}
				onSave={saveGallery}
				onCancel={cancelGallery}
				onChange={(next) => setUploadedGallery(next as any)}
				onRemove={handleRemoveGalleryItem}
				loading={saving}
				isVisible={isScreenFocused}
				style={isLargeScreen && carouselMaxHeight ? ({ maxHeight: carouselMaxHeight, height: carouselMaxHeight } as any) : undefined}
				previewHeight={carouselPreviewHeight}
			/>
		)
	}, [carouselMedia, product?._id, canEditProduct, editMode.gallery, saveGallery, cancelGallery, saving, isScreenFocused, isLargeScreen, carouselMaxHeight, carouselPreviewHeight, translate])

	if (isInitialLoading && !product) {
		return (
			<View key={productSlug} style={[styles.container, { backgroundColor: colors.background }]}>
				<Stack.Screen options={{ title: displayTitle, subtitle: productSlug } as any} />
				<Spinner />
			</View>
		)
	}
	if (!product) {
		return (
			<View key={productSlug} style={[styles.container, { backgroundColor: colors.background }]}>
				<Stack.Screen options={{ title: translate('error', 'Error'), subtitle: productSlug } as any} />
				<SmartHeader title={translate('error', 'Error')} fallbackRoute="/feed" />
				<ErrorBlock onRetry={refresh} />
			</View>
		)
	}
	const priceTotal = product.price.total
	const unitPrice = (priceTotal[currency as keyof typeof priceTotal] as number | null | undefined) || priceTotal.tnd || 0
	const isAvailable = product.stock.quantity > 0 && product.state?.code === 'active'
	const renderInfoCard = () => (
		<>
			<MultiLingualCard
				name={editMode.names ? { en: nameEn, tn_latn: nameTnLatn, tn_arab: nameTnArab } : (product.name as any)}
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
			<ProductPricingCard
				variant={editMode.pricing ? 'edit' : 'view'}
				colors={colors}
				translate={translate}
				loading={saving}
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
				formattedPrice={formatPrice({ total: { [currency]: unitPrice } })}
				unitMeasure={product.unit?.measure}
				minLimit={product.unit?.min}
				maxLimit={product.unit?.max}
				singlePieceMin={product.unit?.singlePiece?.minWeightKg}
				singlePieceAvg={product.unit?.singlePiece?.avgWeightKg}
				singlePieceMax={product.unit?.singlePiece?.maxWeightKg}
				canEdit={canEditProduct}
				onEditPress={canEditProduct ? () => setEditMode((prev) => ({ ...prev, pricing: true })) : undefined}
				onSavePress={savePricing}
				onCancelPress={cancelPricing}
			/>
			<StockCard
				variant={editMode.stock ? 'edit' : 'view'}
				stockQuantity={stockQuantity}
				setStockQuantity={setStockQuantity}
				minThreshold={minThreshold}
				setMinThreshold={setMinThreshold}
				stockQuantityVal={product.stock?.quantity}
				minThresholdVal={product.stock?.minThreshold}
				canEdit={canEditProduct}
				onEditPress={canEditProduct ? () => setEditMode((prev) => ({ ...prev, stock: true })) : undefined}
				onSavePress={saveStock}
				onCancelPress={cancelStock}
				loading={saving}
			/>
			{isAvailable && <CheckoutCard unitPrice={unitPrice} quantity={quantity} unitMeasure={product.unit?.measure} onIncrement={increment} onDecrement={decrement} onAddToCart={handleAddToCart} />}
		</>
	)
	const renderMetadata = () => {
		const hasPhone = Boolean(product?.business?.contact?.phone?.fullNumber || product?.business?.contact?.backupPhones?.[0]?.fullNumber)
		const hasWhatsApp = Boolean(product?.business?.contact?.whatsapp || product?.business?.contact?.phone?.fullNumber || product?.business?.contact?.backupPhones?.[0]?.fullNumber)
		const hasEmail = Boolean(product?.business?.contact?.email)
		const hasWebsite = Boolean(product?.business?.contact?.website)
		const hasDirections = Boolean(product?.business?.location?.coordinates?.length || product?.business?.address)
		return (
			<View style={styles.metadataContainer}>
				<View style={[styles.metaCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
					<View style={[styles.metaCardHeader, styles.metaCardHeaderWithActions]}>
						<TouchableOpacity onPress={handleBusinessNavPress} activeOpacity={0.75} style={styles.metaCardHeaderLeft}>
							<View style={styles.metaCardTitleWrap}>
								{product.business?.media?.thumbnail?.url ? (
									<SmartMediaView media={product.business.media.thumbnail.url} style={styles.metaCardIconBg} />
								) : (
									<View style={[styles.metaCardIconBg, { backgroundColor: colors.primary + '15' }]}>
										<MaterialIcons name="store" size={16} color={colors.primary} />
									</View>
								)}
								<Text style={[styles.metaCardTitle, { color: colors.textTertiary }]}>{translate('business', 'Business')}</Text>
							</View>
						</TouchableOpacity>
						{(hasPhone || hasWhatsApp || hasEmail || hasWebsite || hasDirections) && (
							<View style={[styles.contactButtonsRow, styles.contactButtonsRowInHeader]}>
								<PhoneButton phone={product?.business?.contact?.phone} backupPhones={product?.business?.contact?.backupPhones} size={40} />
								<WhatsAppButton
									whatsapp={product?.business?.contact?.whatsapp || product?.business?.contact?.phone?.fullNumber || product?.business?.contact?.backupPhones?.[0]?.fullNumber}
									size={40}
								/>
								<EmailButton email={product?.business?.contact?.email} size={40} />
								<WebsiteButton website={product?.business?.contact?.website} size={40} />
								<DirectionsButton location={product?.business?.location} address={product?.business?.address} size={40} />
							</View>
						)}
					</View>
					<TouchableOpacity onPress={handleBusinessNavPress} activeOpacity={0.75}>
						<Text style={[styles.metaCardName, { color: colors.text }]}>{localize(product.business?.name)}</Text>
						{product.business?.address && (
							<Text style={[styles.metaCardSub, { color: colors.textSecondary }]}>
								{formatAddress(product.business.address, localize) || [product.business.address.city, product.business.address.country].filter(Boolean).join(', ')}
							</Text>
						)}
					</TouchableOpacity>
				</View>
				{product.defaultProduct && (
					<View style={[styles.metaCardStatic, { backgroundColor: colors.background, borderColor: colors.border }]}>
						<View style={styles.metaCardHeader}>
							<View style={styles.metaCardTitleWrap}>
								<View style={[styles.metaCardIconBg, { backgroundColor: colors.primary + '15' }]}>
									<Ionicons name="fish-outline" size={16} color={colors.primary} />
								</View>
								<Text style={[styles.metaCardTitle, { color: colors.textTertiary }]}>{translate('default_product', 'Default Product')}</Text>
							</View>
						</View>
						<Text style={[styles.metaCardName, { color: colors.text }]}>{localize(product.defaultProduct.name)}</Text>
					</View>
				)}
				{product.availability && (
					<View style={[styles.metaCardStatic, { backgroundColor: colors.background, borderColor: colors.border }]}>
						<View style={styles.metaCardHeader}>
							<View style={styles.metaCardTitleWrap}>
								<View style={[styles.metaCardIconBg, { backgroundColor: colors.primary + '15' }]}>
									<Ionicons name="calendar-outline" size={16} color={colors.primary} />
								</View>
								<Text style={[styles.metaCardTitle, { color: colors.textTertiary }]}>{translate('availability', 'Availability')}</Text>
							</View>
						</View>
						<Text style={[styles.availabilityText, { color: colors.textSecondary }]}>
							{translate('available_from', 'Available from')}: {new Date(product.availability.startDate).toLocaleDateString()}
						</Text>
						{product.availability.endDate && (
							<Text style={[styles.availabilityText, { color: colors.textSecondary }]}>
								{translate('available_until', 'Available until')}: {new Date(product.availability.endDate).toLocaleDateString()}
							</Text>
						)}
					</View>
				)}
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
		)
	}
	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen
				options={
					{
						title: displayTitle,
						subtitle: productSlug,
						headerActions: headerActions as any
					} as any
				}
			/>
			{isLargeScreen ? (
				isWeb ? (
					<SmartHeader.ScrollView
						style={styles.container}
						contentContainerStyle={[styles.scrollContent, { paddingTop: 16, paddingBottom: 40 + insets.bottom }]}
						refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
						onScroll={onScroll}
						scrollEventThrottle={16}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<View style={styles.splitLayoutContainer}>
							<View
								style={[styles.leftColumn, { position: 'sticky' as any, top: headerHeight + 16, alignSelf: 'flex-start', height: 'fit-content' as any, maxHeight: carouselMaxHeight as any } as any]}
							>
								{renderMediaCarousel()}
							</View>
							<View style={styles.rightColumn}>
								{renderInfoCard()}
								{renderMetadata()}
								{product._id && <ReviewSection targetResource="products" targetId={product._id} targetName={localize(product.name)} />}
							</View>
						</View>
					</SmartHeader.ScrollView>
				) : (
					<View style={styles.splitFixedContainer}>
						<View style={[styles.leftFixed, { paddingTop: headerHeight + 16, height: carouselMaxHeight as any, maxHeight: carouselMaxHeight as any }]}>
							<View style={styles.leftFixedInner}>{renderMediaCarousel()}</View>
						</View>
						<SmartHeader.ScrollView
							style={styles.rightScroll}
							contentContainerStyle={[styles.scrollContent, { paddingTop: 16, paddingBottom: 40 + insets.bottom, maxWidth: undefined, alignSelf: 'stretch', width: '100%' }]}
							refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
							onScroll={onScroll}
							scrollEventThrottle={16}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
						>
							<View style={styles.rightColumn}>
								{renderInfoCard()}
								{renderMetadata()}
								{product._id && <ReviewSection targetResource="products" targetId={product._id} targetName={localize(product.name)} />}
							</View>
						</SmartHeader.ScrollView>
					</View>
				)
			) : (
				<SmartHeader.ScrollView
					style={styles.container}
					contentContainerStyle={[styles.scrollContent, { paddingTop: 16, paddingBottom: 40 + insets.bottom }]}
					refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
					onScroll={onScroll}
					scrollEventThrottle={16}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.mobileLayoutContainer}>
						{renderMediaCarousel()}
						{renderInfoCard()}
						{renderMetadata()}
						{product._id && <ReviewSection targetResource="products" targetId={product._id} targetName={localize(product.name)} />}
					</View>
				</SmartHeader.ScrollView>
			)}
			{product && (
				<QRCodeModal
					visible={showQRCode}
					onClose={() => setShowQRCode(false)}
					value={`${config.frontend.url}/p/${product.slug}`}
					title={localize(product.name)}
					subtitle={`${product.slug}`}
					filenamePrefix={`product_${product.slug}`}
				/>
			)}
		</View>
	)
}
const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	scrollContent: {
		alignSelf: 'center',
		width: '100%',
		maxWidth: 1200,
		paddingHorizontal: 16
	},
	splitLayoutContainer: {
		flexDirection: 'row',
		width: '100%',
		gap: 24,
		marginTop: 8
	},
	splitFixedContainer: {
		flex: 1,
		flexDirection: 'row',
		width: '100%',
		maxWidth: 1200,
		alignSelf: 'center',
		gap: 24,
		paddingHorizontal: 16,
		paddingTop: 8
	},
	leftFixed: {
		width: 380,
		maxWidth: 480,
		flex: 0.9,
		alignSelf: 'flex-start'
	},
	leftFixedInner: {
		width: '100%',
		height: '100%'
	},
	rightScroll: {
		flex: 1.1
	},
	leftColumn: {
		flex: 1.1,
		gap: 16
	},
	rightColumn: {
		flex: 0.9,
		gap: 16
	},
	mobileLayoutContainer: {
		width: '100%',
		gap: 16
	},
	metadataContainer: {
		gap: 12
	},
	metaCard: {
		borderRadius: 16,
		padding: 16,
		borderWidth: 1
	},
	metaCardStatic: {
		borderRadius: 16,
		padding: 16,
		borderWidth: 1
	},
	metaCardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 10
	},
	metaCardHeaderWithActions: {
		alignItems: 'flex-start',
		marginBottom: 12
	},
	metaCardHeaderLeft: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		marginRight: 12
	},
	metaCardTitleWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8
	},
	metaCardIconBg: {
		width: 24,
		height: 24,
		borderRadius: 6,
		justifyContent: 'center',
		alignItems: 'center'
	},
	metaCardTitle: {
		fontSize: 11,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.8
	},
	metaCardTitleStatic: {
		fontSize: 11,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.8,
		marginBottom: 10
	},
	metaCardName: {
		fontSize: 16,
		fontWeight: '700'
	},
	metaCardSub: {
		fontSize: 13,
		marginTop: 3,
		fontWeight: '500'
	},
	tagWrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8
	},
	tagItem: {
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 8
	},
	tagText: {
		fontSize: 12,
		fontWeight: '600'
	},
	availabilityText: {
		fontSize: 14,
		fontWeight: '500',
		marginBottom: 4
	},
	contactButtonsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8
	},
	contactButtonsRowInHeader: {
		justifyContent: 'flex-end',
		paddingTop: 0,
		marginTop: 0
	}
})
