import { useEffect, useState, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, RefreshControl, TouchableOpacity, useWindowDimensions, Platform, ScrollView, ActivityIndicator, Linking } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { getItem, setItem } from '@/core/storage'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { useTheme, createShadow } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import { useLayout } from '@/core/contexts/LayoutContext'
import { getProductBySlug, updateProduct } from '@/features/products/products.api'
import { ProductType, FileRef } from '@/features/products/products.type'
import ProductNamesSection from '@/features/products/common/ProductNamesSection'
import ProductPricingSection from '@/features/products/common/ProductPricingSection'
import ProductStockSection from '@/features/products/common/ProductStockSection'
import ProductGallerySection from '@/features/products/common/ProductGallerySection'
import ProductSpecsSection from '@/features/products/common/ProductSpecsSection'
import { parseError } from '@/core/helpers/errorHandler'
import ErrorState from '@/features/common/ErrorState'
import LoadingState from '@/features/common/LoadingState'
import { SmartHeader } from '@/core/smart-header'
import SmartImage from '@/core/SmartImageViewer'
import { toast } from '@/features/common/Toast'
import { LinearGradient } from 'expo-linear-gradient'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import ReviewSection from '@/features/reviews/Reviews'
import QRCodeModal from '@/features/common/QRCodeModal'
import { uploadFile } from '@/core/file'
import { config } from '@/config'

export default function ProductScreen() {
	const { productSlug } = useLocalSearchParams<{ productSlug: string }>()
	const router = useRouter()
	const { colors } = useTheme()
	const { localize, translate, currency, formatPrice } = useUser()
	const { onScroll } = useScrollHandler()
	const { setTabBarVisible } = useLayout()
	const { width, height } = useWindowDimensions()
	const insets = useSafeAreaInsets()

	const [product, setProduct] = useState<ProductType | null>(null)
	const [viewer, setViewer] = useState<{ canEdit?: boolean; canCreate?: boolean } | null>(null)
	const [activeImage, setActiveImage] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)
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

	// Stock
	const [stockQuantity, setStockQuantity] = useState('0')
	const [minThreshold, setMinThreshold] = useState('10')

	// Gallery
	const [uploadedGallery, setUploadedGallery] = useState<FileRef[]>([])
	const [uploadingPhoto, setUploadingPhoto] = useState(false)

	// Specs
	const [caliber, setCaliber] = useState<1 | 2 | 3 | 4 | 5>(3)
	const [originStreet, setOriginStreet] = useState('')
	const [originCity, setOriginCity] = useState('')
	const [originRegion, setOriginRegion] = useState('')
	const [originPostalCode, setOriginPostalCode] = useState('')
	const [originCountry, setOriginCountry] = useState('')

	const displayTitle = product ? localize(product.name) : translate('loading', 'Loading...')
	const isLandscape = width > height
	const isLargeScreen = width > 800 && height > 600
	const imageHeight = isLandscape ? (isLargeScreen ? 420 : 220) : 420
	const canEditProduct = viewer ? viewer.canEdit === true : false

	const syncProductToState = useCallback((prod: ProductType) => {
		setNameEn(prod.name?.en || '')
		setNameTnLatn(prod.name?.tn_latn || '')
		setNameTnArab(prod.name?.tn_arab || '')
		setPriceTND(prod.price?.total?.tnd?.toString() || '')
		setUnit(prod.unit?.measure || 'kg')
		setMinUnit(prod.unit?.min?.toString() || '1')
		setMaxUnit(prod.unit?.max?.toString() || '10')
		setUnitStep(prod.unit?.step?.toString() || '1')
		setStockQuantity(prod.stock?.quantity?.toString() || '0')
		setMinThreshold(prod.stock?.minThreshold?.toString() || '10')
		setUploadedGallery(prod.media?.gallery || [])
		setCaliber((prod.specs?.caliber as 1 | 2 | 3 | 4 | 5) || 3)
		setOriginStreet(prod.specs?.origin?.street || '')
		setOriginCity(prod.specs?.origin?.city || '')
		setOriginRegion(prod.specs?.origin?.region || '')
		setOriginPostalCode(prod.specs?.origin?.postalCode || '')
		setOriginCountry(prod.specs?.origin?.country || '')
	}, [])

	useEffect(() => {
		if (product?.unit?.min) {
			setQuantity(product.unit.min)
		}
	}, [product])

	const increment = () => {
		if (!product) return
		const step = product.unit?.step || 1
		const maxQuantity = product.unit?.max || Infinity
		const stockQty = product.stock?.quantity || 0
		setQuantity((prev) => {
			const next = Math.round((prev + step) * 100) / 100
			return next <= maxQuantity && next <= stockQty ? next : prev
		})
	}

	const decrement = () => {
		if (!product) return
		const step = product.unit?.step || 1
		const minQty = product.unit?.min || 1
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
				message: `${localize(product.name)} ${translate('cart_added_to_cart', 'added to cart')}`,
				color: '#10B981',
				screen: '/purchases?status=cart'
			})
		} catch {
			toast.show({ title: 'Error', message: translate('cart_failed_to_add', 'Failed to add to cart'), color: '#EF4444' })
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
				setActiveImage(null)
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
		[productSlug, syncProductToState]
	)

	useEffect(() => {
		loadProduct()
	}, [loadProduct])

	const handleRefresh = () => {
		setRefreshing(true)
		loadProduct(true)
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
			const res = await updateProduct(productSlug!, {
				name: {
					en: nameEn.trim() || product?.name?.en || '',
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
		if (product) syncProductToState(product)
		setEditMode((prev) => ({ ...prev, names: false }))
	}

	const savePricing = async () => {
		if (!canEditProduct) return
		try {
			setSaving(true)
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
					step: unitStep ? parseFloat(unitStep) : 1
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
		if (product) syncProductToState(product)
		setEditMode((prev) => ({ ...prev, stock: false }))
	}

	const handleUploadPhoto = async () => {
		if (!canEditProduct) return
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
		if (!canEditProduct) return
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
		if (product) syncProductToState(product)
		setEditMode((prev) => ({ ...prev, gallery: false }))
	}

	const saveSpecs = async () => {
		if (!canEditProduct) return
		try {
			setSaving(true)
			const res = await updateProduct(productSlug!, {
				specs: {
					caliber,
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
		if (product) syncProductToState(product)
		setEditMode((prev) => ({ ...prev, specs: false }))
	}

	const handleBusinessNavPress = () => {
		if (product?.business?.slug) {
			router.push(`/businesses/${product.business.slug}` as any)
		}
	}

	const handleCallBusiness = async () => {
		const phoneNumber = product?.business?.contact?.phone?.fullNumber || product?.business?.contact?.backupPhones?.[0]?.fullNumber
		if (!phoneNumber) {
			toast.show({ title: translate('error', 'Error'), message: translate('no_phone_number', 'No phone number available'), color: colors.error })
			return
		}
		const url = `tel:${phoneNumber}`
		const canOpen = await Linking.canOpenURL(url)
		if (canOpen) {
			Linking.openURL(url)
		} else {
			toast.show({ title: translate('error', 'Error'), message: translate('cannot_open_phone', 'Cannot open phone app'), color: colors.error })
		}
	}

	const handleWhatsAppBusiness = async () => {
		const whatsapp = product?.business?.contact?.whatsapp || product?.business?.contact?.phone?.fullNumber
		if (!whatsapp) {
			toast.show({ title: translate('error', 'Error'), message: translate('no_whatsapp', 'No WhatsApp number available'), color: colors.error })
			return
		}
		const cleanNumber = whatsapp.replace(/[^\d+]/g, '')
		const url = `https://wa.me/${cleanNumber}`
		try {
			const canOpen = await Linking.canOpenURL(url)
			if (canOpen) {
				Linking.openURL(url)
			} else {
				Linking.openURL(`whatsapp://send?phone=${cleanNumber}`)
			}
		} catch {
			Linking.openURL(`whatsapp://send?phone=${cleanNumber}`)
		}
	}

	const handleEmailBusiness = async () => {
		const email = product?.business?.contact?.email
		if (!email) {
			toast.show({ title: translate('error', 'Error'), message: translate('no_email', 'No email address available'), color: colors.error })
			return
		}
		Linking.openURL(`mailto:${email}`)
	}

	const headerActions = useMemo(
		() => [
			{
				key: 'qr-code',
				iconName: 'qr-code-outline',
				onPress: () => setShowQRCode(true),
				accessibilityLabel: 'QR Code'
			},
			{
				key: 'cart',
				iconName: 'cart-outline',
				badgeCount: cart.length,
				onPress: () => router.push('/purchases?status=cart' as any),
				accessibilityLabel: 'View Cart'
			},
			{
				key: 'refresh',
				onPress: handleRefresh,
				isRefreshing: refreshing,
				accessibilityLabel: 'Refresh'
			}
		],
		[cart.length, handleRefresh, refreshing, router]
	)

	const combinedGallery = useMemo(() => {
		if (!product) return []
		const list: any[] = []
		const thumbUrl = product.media?.thumbnail?.url || product.defaultProduct?.media?.thumbnail?.url
		if (thumbUrl) {
			list.push({ _id: 'thumbnail', url: thumbUrl })
		}
		if (product.media?.gallery) {
			product.media.gallery.forEach((item) => {
				if (item.url !== thumbUrl) {
					list.push(item)
				}
			})
		}
		return list
	}, [product])

	if (loading && !product) {
		return (
			<View key={productSlug} style={[styles.container, { backgroundColor: colors.background }]}>
				<Stack.Screen options={{ title: displayTitle }} />
				<LoadingState />
			</View>
		)
	}

	if (error && !product) {
		return (
			<View key={productSlug} style={[styles.container, { backgroundColor: colors.background }]}>
				<Stack.Screen options={{ title: displayTitle }} />
				<ErrorState
					title={error.title}
					message={error.message}
					onRetry={() => loadProduct()}
					icon={error.type === 'network' || error.type === 'timeout' ? 'cloud-offline-outline' : 'alert-circle-outline'}
				/>
			</View>
		)
	}

	if (!product) {
		return (
			<View key={productSlug} style={[styles.container, { backgroundColor: colors.background }]}>
				<Stack.Screen options={{ title: displayTitle }} />
				<ErrorState
					title={translate('product_not_found', 'Product Not Found')}
					message={translate('product_not_found_desc', 'The product you are looking for could not be found.')}
					onRetry={() => loadProduct()}
					icon="fish-outline"
				/>
			</View>
		)
	}

	const imageUrl = product.media?.thumbnail?.url || product.defaultProduct?.media?.thumbnail?.url
	const priceTotal = product.price.total
	const unitPrice = (priceTotal[currency as keyof typeof priceTotal] as number | null | undefined) || priceTotal.tnd || 0
	const isAvailable = product.stock.quantity > 0 && product.state?.code === 'active'
	const stockQty = product.stock?.quantity || 0
	const stockMinThreshold = product.stock?.minThreshold || 5
	const isLowStock = stockQty > 0 && stockQty <= stockMinThreshold
	const isOutOfStock = stockQty === 0
	const productState = product.state?.code || 'active'
	const isProductActive = productState === 'active'

	const getStockStatus = () => {
		if (isOutOfStock) return { color: colors.error, bgColor: colors.error + '12', label: translate('out_of_stock', 'Out of Stock'), icon: 'alert-circle' as const }
		if (isLowStock) return { color: colors.warning, bgColor: colors.warning + '12', label: translate('low_stock', 'Low Stock'), icon: 'warning' as const }
		return { color: colors.success, bgColor: colors.success + '12', label: translate('in_stock', 'In Stock'), icon: 'checkmark-circle' as const }
	}
	const stockStatus = getStockStatus()

	const renderHero = () => {
		const currentUrl = activeImage || (combinedGallery.length > 0 ? combinedGallery[0].url : null)

		return (
			<View style={styles.heroContainer}>
				<View style={[styles.imageContainer, { height: imageHeight }]}>
					<SmartImage source={currentUrl} style={styles.productImage} resizeMode="cover" entityType="product" />
					{!isAvailable && (
						<View style={styles.unavailableOverlay}>
							<Text style={styles.unavailableText}>{product.state?.code !== 'active' ? translate('unavailable', 'Unavailable') : translate('out_of_stock', 'Out of Stock')}</Text>
						</View>
					)}
					<LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.imageGradient}>
						<View style={[styles.stockBadge, { backgroundColor: stockStatus.bgColor, borderColor: stockStatus.color + '40' }]}>
							<View style={[styles.stockDot, { backgroundColor: stockStatus.color }]} />
							<Text style={[styles.stockText, { color: stockStatus.color }]}>{stockStatus.label}</Text>
						</View>
					</LinearGradient>
				</View>

				{combinedGallery.length > 1 && (
					<ProductGallerySection editable={false} gallery={combinedGallery} colors={colors} translate={translate} activeImage={currentUrl} onThumbnailPress={(url) => setActiveImage(url)} />
				)}
			</View>
		)
	}

	const renderInfoCard = () => (
		<View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
			{saving && (
				<View style={styles.savingOverlay}>
					<ActivityIndicator size="small" color={colors.primary} />
				</View>
			)}

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
				productNameObj={product.name}
				localize={localize}
				canEdit={canEditProduct}
				onEditPress={canEditProduct ? () => setEditMode((prev) => ({ ...prev, names: true })) : undefined}
				onSavePress={saveNames}
				onCancelPress={cancelNames}
			/>

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
				formattedPrice={formatPrice({ total: { [currency]: unitPrice } })}
				unitMeasure={product.unit?.measure}
				minLimit={product.unit?.min}
				maxLimit={product.unit?.max}
				canEdit={canEditProduct}
				onEditPress={canEditProduct ? () => setEditMode((prev) => ({ ...prev, pricing: true })) : undefined}
				onSavePress={savePricing}
				onCancelPress={cancelPricing}
			/>

			<ProductStockSection
				variant={editMode.stock ? 'edit' : 'view'}
				colors={colors}
				translate={translate}
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
			/>

			{isAvailable && (
				<View style={[styles.checkoutPanel, { borderTopColor: colors.borderLight }]}>
					<View style={styles.checkoutTotalCol}>
						<Text style={[styles.checkoutTotalLabel, { color: colors.textSecondary }]}>{translate('total', 'Total')}</Text>
						<Text style={[styles.checkoutTotalPrice, { color: colors.primary }]}>{formatPrice({ total: { [currency]: unitPrice * quantity } })}</Text>
					</View>

					<View style={styles.checkoutActionsCol}>
						<View style={[styles.stepperContainer, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight }]}>
							<TouchableOpacity onPress={decrement} style={styles.stepperBtn} activeOpacity={0.6}>
								<MaterialIcons name="remove" size={18} color={colors.text} />
							</TouchableOpacity>
							<Text style={[styles.stepperText, { color: colors.text }]}>{quantity}</Text>
							<TouchableOpacity onPress={increment} style={styles.stepperBtn} activeOpacity={0.6}>
								<MaterialIcons name="add" size={18} color={colors.text} />
							</TouchableOpacity>
						</View>

						<TouchableOpacity style={[styles.cartSubmitBtn, { backgroundColor: colors.primary }]} onPress={handleAddToCart} activeOpacity={0.85}>
							<MaterialIcons name="add-shopping-cart" size={20} color={colors.textOnPrimary || '#FFFFFF'} />
						</TouchableOpacity>
					</View>
				</View>
			)}
		</View>
	)

	const renderGallerySection = () => (
		<ProductGallerySection
			editable={editMode.gallery && canEditProduct}
			gallery={canEditProduct ? uploadedGallery : product.media?.gallery || []}
			colors={colors}
			translate={translate}
			onUploadPress={handleUploadPhoto}
			onRemovePress={(item) => setUploadedGallery((prev) => prev.filter((img) => img._id !== item._id))}
			uploading={uploadingPhoto}
			onEditPress={canEditProduct ? () => setEditMode((prev) => ({ ...prev, gallery: true })) : undefined}
			onSavePress={saveGallery}
			onCancelPress={cancelGallery}
		/>
	)

	const renderMetadata = () => {
		const hasPhone = Boolean(product?.business?.contact?.phone?.fullNumber || product?.business?.contact?.backupPhones?.[0]?.fullNumber)
		const hasWhatsApp = Boolean(product?.business?.contact?.whatsapp || product?.business?.contact?.phone?.fullNumber)
		const hasEmail = Boolean(product?.business?.contact?.email)

		return (
			<View style={styles.metadataContainer}>
				<View style={[styles.metaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={[styles.metaCardHeader, styles.metaCardHeaderWithActions]}>
						<TouchableOpacity onPress={handleBusinessNavPress} activeOpacity={0.75} style={styles.metaCardHeaderLeft}>
							<View style={styles.metaCardTitleWrap}>
								{product.business?.media?.thumbnail?.url ? (
									<SmartImage source={product.business.media.thumbnail.url} style={styles.metaCardIconBg} entityType="business" />
								) : (
									<View style={[styles.metaCardIconBg, { backgroundColor: colors.primary + '15' }]}>
										<MaterialIcons name="store" size={16} color={colors.primary} />
									</View>
								)}
								<Text style={[styles.metaCardTitle, { color: colors.textTertiary }]}>{translate('business', 'Business')}</Text>
							</View>
						</TouchableOpacity>
						{(hasPhone || hasWhatsApp || hasEmail) && (
							<View style={[styles.contactButtonsRow, styles.contactButtonsRowInHeader]}>
								{hasPhone && (
									<TouchableOpacity style={[styles.contactBtn, { backgroundColor: colors.primary + '12' }]} onPress={handleCallBusiness} activeOpacity={0.7}>
										<Ionicons name="call" size={20} color={colors.primary} />
									</TouchableOpacity>
								)}
								{hasWhatsApp && (
									<TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#25D36612' }]} onPress={handleWhatsAppBusiness} activeOpacity={0.7}>
										<Ionicons name="logo-whatsapp" size={20} color="#25D366" />
									</TouchableOpacity>
								)}
								{hasEmail && (
									<TouchableOpacity style={[styles.contactBtn, { backgroundColor: colors.surfaceVariant }]} onPress={handleEmailBusiness} activeOpacity={0.7}>
										<Ionicons name="mail" size={20} color={colors.textSecondary} />
									</TouchableOpacity>
								)}
							</View>
						)}
					</View>
					<TouchableOpacity onPress={handleBusinessNavPress} activeOpacity={0.75}>
						<Text style={[styles.metaCardName, { color: colors.text }]}>{localize(product.business?.name)}</Text>
						{product.business?.address && (
							<Text style={[styles.metaCardSub, { color: colors.textSecondary }]}>
								{product.business.address.city}, {product.business.address.country}
							</Text>
						)}
					</TouchableOpacity>
				</View>

				{product.defaultProduct && (
					<View style={[styles.metaCardStatic, { backgroundColor: colors.card, borderColor: colors.border }]}>
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

				{product.searchTerms && product.searchTerms.length > 0 && (
					<View style={[styles.metaCardStatic, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<Text style={[styles.metaCardTitleStatic, { color: colors.textTertiary }]}>{translate('search_keywords', 'Search Keywords')}</Text>
						<View style={styles.tagWrap}>
							{product.searchTerms.map((keyword, index) => (
								<View key={index} style={[styles.tagItem, { backgroundColor: colors.surfaceVariant }]}>
									<Text style={[styles.tagText, { color: colors.textSecondary }]}>{keyword}</Text>
								</View>
							))}
						</View>
					</View>
				)}

				{product.availability && (
					<View style={[styles.metaCardStatic, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen
				options={
					{
						title: displayTitle,
						headerActions: headerActions as any
					} as any
				}
			/>

			<SmartHeader.ScrollView
				style={styles.container}
				contentContainerStyle={[styles.scrollContent, { paddingTop: 16, paddingBottom: 40 + insets.bottom }]}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
				onScroll={onScroll}
				scrollEventThrottle={16}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{isLargeScreen ? (
					<View style={styles.splitLayoutContainer}>
						<View style={styles.leftColumn}>
							{renderHero()}
							{renderGallerySection()}
							{renderMetadata()}
						</View>
						<View style={styles.rightColumn}>
							{renderInfoCard()}
							{product._id && <ReviewSection targetResource="products" targetId={product._id} targetName={localize(product.name)} />}
						</View>
					</View>
				) : (
					<View style={styles.mobileLayoutContainer}>
						{renderHero()}
						{renderInfoCard()}
						{renderGallerySection()}
						{renderMetadata()}
						{product._id && <ReviewSection targetResource="products" targetId={product._id} targetName={localize(product.name)} />}
					</View>
				)}
			</SmartHeader.ScrollView>

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
	heroContainer: {
		width: '100%'
	},
	imageContainer: {
		width: '100%',
		borderRadius: 24,
		overflow: 'hidden',
		position: 'relative',
		...createShadow({ offsetY: 4, opacity: 0.2, radius: 12, elevation: 4 })
	},
	productImage: {
		width: '100%',
		height: '100%'
	},
	unavailableOverlay: {
		...StyleSheet.absoluteFill,
		backgroundColor: 'rgba(0,0,0,0.7)',
		justifyContent: 'center',
		alignItems: 'center'
	},
	unavailableText: {
		color: '#EF4444',
		fontSize: 22,
		fontWeight: '800',
		textTransform: 'uppercase',
		letterSpacing: 1.5
	},
	imageGradient: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		height: 120,
		justifyContent: 'flex-end',
		padding: 20
	},
	stockBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		alignSelf: 'flex-start',
		borderWidth: 1
	},
	stockDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		marginRight: 6
	},
	stockText: {
		fontSize: 12,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	card: {
		borderRadius: 24,
		padding: 24,
		borderWidth: 1,
		...createShadow({ offsetY: 2, opacity: 0.08, radius: 6, elevation: 2 })
	},
	savingOverlay: {
		position: 'absolute',
		right: 16,
		top: 16,
		zIndex: 10
	},
	checkoutPanel: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 20,
		paddingTop: 20,
		borderTopWidth: 1
	},
	checkoutTotalCol: {
		flex: 1
	},
	checkoutTotalLabel: {
		fontSize: 10,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.8,
		marginBottom: 2
	},
	checkoutTotalPrice: {
		fontSize: 22,
		fontWeight: '900',
		letterSpacing: -0.5
	},
	checkoutActionsCol: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12
	},
	stepperContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 12,
		padding: 3,
		borderWidth: 1
	},
	stepperBtn: {
		width: 36,
		height: 36,
		justifyContent: 'center',
		alignItems: 'center'
	},
	stepperText: {
		fontSize: 16,
		fontWeight: '800',
		minWidth: 32,
		textAlign: 'center'
	},
	cartSubmitBtn: {
		width: 46,
		height: 46,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({ web: { boxShadow: '0 4px 12px rgba(14,165,233,0.35)' } as any })
	},
	metadataContainer: {
		gap: 12
	},
	metaCard: {
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		...createShadow({ offsetY: 1, opacity: 0.05, radius: 4, elevation: 1 })
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
	},
	contactBtn: {
		alignItems: 'center',
		justifyContent: 'center',
		width: 40,
		height: 40,
		borderRadius: 12
	}
})
