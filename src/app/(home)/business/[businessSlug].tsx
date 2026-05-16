import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, FlatList, Platform, RefreshControl, TextInput } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getMyBusinessBySlug, getBusinessProducts, updateMyBusiness } from '@/components/businesses/businesses.api'
import { Business } from '@/components/businesses/businesses.interface'
import { ProductType } from '@/components/products/products.type'
import { useTheme } from '@/core/contexts/ThemeContext'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { parseError } from '@/core/helpers/errorHandler'
import ErrorState from '@/components/common/ErrorState'
import ScreenHeader from '@/components/common/ScreenHeader'
import SmartImage from '@/core/helpers/SmartImage'
import { LinearGradient } from 'expo-linear-gradient'
import { useUser } from '@/core/contexts/UserContext'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import { uploadFile } from '@/core/fileHandler'
import { showAlert } from '@/core/helpers/popup'
// Inline Product Card Component
const ProductCard = ({ product, colors, localize, translate }: { product: ProductType; colors: any; localize: (obj: any) => string; translate: (key: string, fallback: string) => string }) => {
	const imageUrl = product.media?.thumbnail?.url || product.defaultProduct?.media?.thumbnail?.url
	const stockQty = product.stock?.quantity || 0
	const minThreshold = product.stock?.minThreshold || 5
	const isLowStock = stockQty > 0 && stockQty <= minThreshold
	const isOutOfStock = stockQty === 0

	const getStockStatus = () => {
		if (isOutOfStock) return { color: '#EF4444', bgColor: '#EF444415', label: translate('out_of_stock', 'Out') }
		if (isLowStock) return { color: '#F59E0B', bgColor: '#F59E0B15', label: translate('low_stock', 'Low') }
		return { color: '#10B981', bgColor: '#10B98115', label: translate('in_stock', 'In Stock') }
	}
	const stockStatus = getStockStatus()

	return (
		<View style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.info || '#3B82F6' }]}>
			<SmartImage source={imageUrl} style={styles.productImage} resizeMode="cover" entityType="product" containerStyle={styles.productImageContainer} />
			<View style={styles.productInfo}>
				<Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
					{localize(product.name)}
				</Text>
				<Text style={[styles.productPrice, { color: colors.primary }]}>
					{product.price?.total?.tnd?.toFixed(2) || '0.00'} TND
					<Text style={[styles.productUnit, { color: colors.textTertiary }]}>/{product.unit?.measure || 'unit'}</Text>
				</Text>
			</View>
			<View style={[styles.stockPill, { backgroundColor: stockStatus.bgColor }]}>
				<Text style={[styles.stockPillText, { color: stockStatus.color }]}>{stockQty}</Text>
			</View>
		</View>
	)
}

export default function MyBusinessDetailsScreen() {
	const { businessSlug } = useLocalSearchParams<{ businessSlug: string }>()
	const router = useRouter()
	const { colors } = useTheme()
	const { localize, translate } = useUser()
	const [business, setBusiness] = useState<Business | null>(null)
	const [products, setProducts] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)
	const { onScroll } = useScrollHandler()

	const [uploadingPhoto, setUploadingPhoto] = useState(false)
	const [editMode, setEditMode] = useState({ photo: false })

	const updatePhotoUrl = (url: string) => {
		if (!business) return
		setBusiness((prev) => {
			if (!prev) return null
			return {
				...prev,
				media: {
					...prev.media,
					thumbnail: {
						...(prev.media?.thumbnail || {}),
						url
					}
				}
			}
		})
	}

	const handleUploadPhoto = async () => {
		if (!businessSlug) return
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

			if (uploadResult.success && uploadResult.file) {
				setBusiness((prev) => {
					if (!prev) return null
					return {
						...prev,
						media: {
							...prev.media,
							thumbnail: uploadResult.file
						}
					}
				})
				showAlert('Success', 'Photo uploaded successfully!')

				try {
					const updatedMedia = {
						...(business?.media || {}),
						thumbnail: uploadResult.file
					}
					await updateMyBusiness(businessSlug, { media: updatedMedia })
					setEditMode((prev) => ({ ...prev, photo: false }))
				} catch (e) {
					console.error('Error saving business photo:', e)
				}
			} else if (uploadResult.success && uploadResult.fileUrl) {
				updatePhotoUrl(uploadResult.fileUrl)
				showAlert('Success', 'Photo uploaded successfully!')

				try {
					const updatedMedia = {
						...(business?.media || {}),
						thumbnail: {
							...(business?.media?.thumbnail || {}),
							url: uploadResult.fileUrl
						}
					}
					await updateMyBusiness(businessSlug, { media: updatedMedia })
					setEditMode((prev) => ({ ...prev, photo: false }))
				} catch (e) {
					console.error('Error saving business photo:', e)
				}
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

	const loadBusinessDetails = useCallback(
		async (isRefresh = false) => {
			if (!businessSlug) return

			try {
				if (!isRefresh) setLoading(true)
				setError(null)

				const [businessResponse, productsResponse] = await Promise.all([getMyBusinessBySlug(businessSlug), getBusinessProducts(businessSlug).catch(() => null)])

				setBusiness(businessResponse.data)
				setProducts(productsResponse?.data?.docs || [])
			} catch (err: any) {
				console.error('Failed to load my business details:', err)
				const errorInfo = parseError(err)
				setError({
					title: errorInfo.title,
					message: errorInfo.message,
					type: errorInfo.type
				})
			} finally {
				setLoading(false)
				setRefreshing(false)
			}
		},
		[businessSlug]
	)

	useEffect(() => {
		loadBusinessDetails()
	}, [loadBusinessDetails])

	const handleRefresh = useCallback(() => {
		setRefreshing(true)
		loadBusinessDetails(true)
	}, [loadBusinessDetails])

	if (loading) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	if (error) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<ScreenHeader title="Business Details" showBack={true} />
				<ErrorState
					title={error.title}
					message={error.message}
					onRetry={() => loadBusinessDetails()}
					icon={error.type === 'network' || error.type === 'timeout' ? 'cloud-offline-outline' : 'alert-circle-outline'}
				/>
			</View>
		)
	}

	if (!business) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<ScreenHeader title="Business Details" showBack={true} />
				<View style={styles.centerContent}>
					<Text style={[styles.errorText, { color: colors.text }]}>Business not found</Text>
				</View>
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScreenHeader title={localize(business.name)} subtitle={translate('manage_business', 'Manage Business')} showBack={true} onRefresh={handleRefresh} isRefreshing={refreshing} />

			<ScrollView
				contentContainerStyle={styles.scrollContent}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
				onScroll={onScroll}
				scrollEventThrottle={16}
			>
				{/* Business Photo Card */}
				<View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.info || '#3B82F6' }]}>
					<View style={styles.photoContainer}>
						<SmartImage source={business.media?.thumbnail?.url} style={styles.profilePhoto} entityType="business" />
						<TouchableOpacity style={[styles.changePhotoButton, editMode.photo && { backgroundColor: colors.primary }]} onPress={() => setEditMode((prev) => ({ ...prev, photo: !prev.photo }))}>
							<Ionicons name={editMode.photo ? 'checkmark' : 'camera'} size={20} color="#fff" />
						</TouchableOpacity>
						<TouchableOpacity style={[styles.uploadPhotoButton, { backgroundColor: colors.primary }]} onPress={handleUploadPhoto} disabled={uploadingPhoto}>
							{uploadingPhoto ? <ActivityIndicator size={16} color="#fff" /> : <Ionicons name="cloud-upload-outline" size={20} color="#fff" />}
						</TouchableOpacity>
					</View>

					{editMode.photo && (
						<View style={[styles.inputGroup, { width: '100%', marginTop: 16, paddingHorizontal: 20 }]}>
							<Text style={styles.inputLabel}>Photo URL</Text>
							<View style={[styles.socialInputContainer, { borderColor: colors.primary + '40', backgroundColor: colors.background }]}>
								<TextInput
									style={[styles.socialInput, { fontSize: 13, color: colors.text }]}
									value={business.media?.thumbnail?.url || ''}
									onChangeText={updatePhotoUrl}
									placeholder="https://example.com/photo.jpg"
									placeholderTextColor={colors.textTertiary}
									selectTextOnFocus
								/>
								<TouchableOpacity
									onPress={async () => {
										try {
											const photoUrl = business.media?.thumbnail?.url
											if (!photoUrl) return
											const updatedMedia = {
												...(business?.media || {}),
												thumbnail: {
													...(business?.media?.thumbnail || {}),
													url: photoUrl
												}
											}
											await updateMyBusiness(businessSlug as string, { media: updatedMedia })
											setEditMode((prev) => ({ ...prev, photo: false }))
											showAlert('Success', 'Photo updated successfully!')
										} catch (e) {
											console.error('Error saving business photo:', e)
											showAlert('Error', 'Failed to save business photo')
										}
									}}
									style={[styles.socialIconBadge, { borderLeftWidth: 1, borderRightWidth: 0, borderLeftColor: colors.border + '20', backgroundColor: colors.primary + '10' }]}
								>
									<Ionicons name="save-outline" size={18} color={colors.primary} />
								</TouchableOpacity>
								<TouchableOpacity
									onPress={() => setEditMode((prev) => ({ ...prev, photo: false }))}
									style={[styles.socialIconBadge, { borderLeftWidth: 1, borderRightWidth: 0, borderLeftColor: colors.border + '20', backgroundColor: '#EF4444' + '10' }]}
								>
									<Ionicons name="close-outline" size={18} color="#EF4444" />
								</TouchableOpacity>
							</View>
						</View>
					)}
				</View>

				{/* Business Status Info */}
				<View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.info || '#3B82F6' }]}>
					<View style={styles.sectionHeader}>
						<MaterialIcons name="info-outline" size={20} color={colors.primary} />
						<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('business_information', 'Business Information')}</Text>
					</View>

					<View style={styles.infoRow}>
						<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{translate('status', 'Status')}</Text>
						<View style={[styles.statusBadge, { backgroundColor: business.isActive !== false ? '#10B98115' : '#EF444415' }]}>
							<Text style={[styles.statusText, { color: business.isActive !== false ? '#10B981' : '#EF4444' }]}>
								{business.isActive !== false ? translate('active', 'ACTIVE') : translate('inactive', 'INACTIVE')}
							</Text>
						</View>
					</View>

					<View style={styles.infoRow}>
						<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{translate('city', 'City')}</Text>
						<Text style={[styles.infoValue, { color: colors.text }]}>{business.address?.city || 'N/A'}</Text>
					</View>

					<View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
						<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{translate('address', 'Address')}</Text>
						<Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
							{business.address?.street || 'N/A'}
						</Text>
					</View>
				</View>

				{/* Products Section */}
				<View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.info || '#3B82F6' }]}>
					<View style={styles.sectionHeader}>
						<Ionicons name="fish-outline" size={20} color={colors.primary} />
						<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('products', 'Products')}</Text>
						<View style={[styles.countBadge, { backgroundColor: colors.primary + '15' }]}>
							<Text style={[styles.countText, { color: colors.primary }]}>{products.length}</Text>
						</View>
					</View>

					{products.length > 0 ? (
						<View style={styles.productsList}>
							{products.map((product) => (
								<ProductCard key={product._id} product={product} colors={colors} localize={localize} translate={translate} />
							))}
						</View>
					) : (
						<View style={styles.emptyProducts}>
							<Ionicons name="fish-outline" size={40} color={colors.textTertiary} />
							<Text style={[styles.emptyText, { color: colors.textSecondary }]}>{translate('no_products_yet', 'No products yet')}</Text>
						</View>
					)}

					{/* Add Product FAB */}
					<TouchableOpacity
						style={[styles.addProductFab, { backgroundColor: colors.primary }]}
						onPress={() => router.push({ pathname: '/business/create-product', params: { businessSlug: business.slug, businessId: business._id } })}
						activeOpacity={0.8}
					>
						<Ionicons name="add" size={28} color="#fff" />
					</TouchableOpacity>
				</View>
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	scrollContent: {
		padding: 16,
		paddingBottom: 40
	},
	centerContent: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	section: {
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
		marginBottom: 16,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.08,
				shadowRadius: 8
			},
			android: {
				elevation: 2
			}
		})
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
		gap: 8
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		flex: 1
	},
	countBadge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12
	},
	countText: {
		fontSize: 13,
		fontWeight: '700'
	},
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: 'rgba(150,150,150,0.15)'
	},
	infoLabel: {
		fontSize: 14,
		fontWeight: '500'
	},
	infoValue: {
		fontSize: 14,
		fontWeight: '600',
		flex: 1,
		textAlign: 'right',
		marginLeft: 16
	},
	statusBadge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 8
	},
	statusText: {
		fontSize: 11,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	errorText: {
		fontSize: 16,
		fontWeight: '600'
	},
	productsList: {
		gap: 10
	},
	productCard: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		gap: 12
	},
	productImageContainer: {
		width: 56,
		height: 56,
		borderRadius: 10,
		overflow: 'hidden'
	},
	productImage: {
		width: '100%',
		height: '100%'
	},
	productInfo: {
		flex: 1
	},
	productName: {
		fontSize: 15,
		fontWeight: '600',
		marginBottom: 4
	},
	productPrice: {
		fontSize: 14,
		fontWeight: '700'
	},
	productUnit: {
		fontSize: 12,
		fontWeight: '500'
	},
	stockPill: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		minWidth: 36,
		alignItems: 'center'
	},
	stockPillText: {
		fontSize: 13,
		fontWeight: '700'
	},
	emptyProducts: {
		alignItems: 'center',
		paddingVertical: 24,
		gap: 8
	},
	emptyText: {
		fontSize: 14,
		fontWeight: '500'
	},
	addProductFab: {
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: 'center',
		justifyContent: 'center',
		alignSelf: 'center',
		marginTop: 16,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.25,
				shadowRadius: 8
			},
			android: {
				elevation: 6
			}
		})
	},
	profileCard: {
		alignItems: 'center',
		paddingVertical: 24,
		borderRadius: 16,
		borderWidth: 1,
		marginBottom: 16,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.08,
				shadowRadius: 8
			},
			android: {
				elevation: 2
			}
		})
	},
	photoContainer: {
		position: 'relative',
		width: 120,
		height: 120,
		marginBottom: 16
	},
	profilePhoto: {
		width: 120,
		height: 120,
		borderRadius: 60,
		borderWidth: 4,
		borderColor: '#fff'
	},
	changePhotoButton: {
		position: 'absolute',
		right: 0,
		bottom: 0,
		backgroundColor: '#1F2937',
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 3,
		borderColor: '#fff',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 4,
		elevation: 4
	},
	uploadPhotoButton: {
		position: 'absolute',
		left: 0,
		bottom: 0,
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 3,
		borderColor: '#fff',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 4,
		elevation: 4
	},
	inputGroup: {
		marginBottom: 16
	},
	inputLabel: {
		fontSize: 13,
		fontWeight: '600',
		marginBottom: 6,
		color: '#6B7280',
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	socialInputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderRadius: 12,
		overflow: 'hidden'
	},
	socialInput: {
		flex: 1,
		padding: 12,
		fontSize: 15
	},
	socialIconBadge: {
		width: 44,
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center'
	}
})
