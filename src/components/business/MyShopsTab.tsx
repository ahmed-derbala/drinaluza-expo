import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import {
	View,
	Text,
	FlatList,
	StyleSheet,
	RefreshControl,
	TouchableOpacity,
	Modal,
	TextInput,
	Alert,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	ViewStyle,
	TextInput as RNTextInput,
	TextStyle
} from 'react-native'
import { useRouter } from 'expo-router'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { getMyShops, createShop } from '../shops/shops.api'
import { Shop, CreateShopRequest } from '../shops/shops.interface'

type ShopsStackParamList = {
	ShopDetails: { shopId: string }
	// Add other screens in the shops stack here
}

type MyShopsTabNavigationProp = NativeStackNavigationProp<ShopsStackParamList, 'ShopDetails'>

interface MyShopsTabProps {
	navigation?: MyShopsTabNavigationProp
}
import { useFocusEffect } from '@react-navigation/native'
import { useTheme } from '../../contexts/ThemeContext'
import { debounce } from 'lodash'

interface ThemeType {
	primary: string
	text: string
	textSecondary: string
	background: string
	card: string
	border: string
}

interface ShopItemProps {
	shop: Shop
	isNavigating: boolean
	onPress: (shop: Shop) => void
	theme: ThemeType
}

interface CreateShopFormProps {
	visible: boolean
	loading: boolean
	shopNameEn: string
	shopNameTnLatn: string
	shopNameTnArab: string
	deliveryRadius: string
	onShopNameEnChange: (text: string) => void
	onShopNameTnLatnChange: (text: string) => void
	onShopNameTnArabChange: (text: string) => void
	onDeliveryRadiusChange: (text: string) => void
	onSubmit: () => void
	onDismiss: () => void
	theme: ThemeType & { textSecondary: string }
}

interface ShopState {
	shops: Shop[]
	loading: boolean
	refreshing: boolean
	modalVisible: boolean
	shopNameEn: string
	shopNameTnLatn: string
	shopNameTnArab: string
	deliveryRadius: string
	creating: boolean
	navigatingShopId: string | null
	error: string | null
}

const DEBOUNCE_DELAY = 300
const MIN_SHOP_NAME_LENGTH = 3
const MAX_SHOP_NAME_LENGTH = 50

const ShopItem: React.FC<ShopItemProps> = React.memo(({ shop, isNavigating, onPress, theme }) => (
	<TouchableOpacity onPress={() => onPress(shop)} disabled={isNavigating}>
		<View style={[styles.card, isNavigating && styles.disabledCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
			<View style={styles.shopHeader}>
				<Text style={[styles.shopName, { color: theme.text }]}>{shop.name?.en || 'Unnamed Shop'}</Text>
				{isNavigating && <ActivityIndicator size="small" color={theme.primary} style={styles.loadingIndicator} />}
			</View>
			{shop.owner && (
				<Text style={[styles.meta, { color: theme.textSecondary }]}>
					Owner: {typeof shop.owner.name === 'object' ? (shop.owner.name as any).en : shop.owner.name} (@{shop.owner.slug})
				</Text>
			)}
			{shop.location?.coordinates?.length === 2 && (
				<Text style={[styles.meta, { color: theme.textSecondary }]}>
					Location: ({shop.location.coordinates[1].toFixed(4)}, {shop.location.coordinates[0].toFixed(4)})
				</Text>
			)}
			{typeof shop.deliveryRadiusKm === 'number' && <Text style={[styles.meta, { color: theme.textSecondary }]}>Delivery radius: {shop.deliveryRadiusKm} km</Text>}
			<Text style={[styles.status, { color: shop.isActive ? '#4CAF50' : '#F44336' }]}>{shop.isActive ? 'Active' : 'Inactive'}</Text>
			<Text style={[styles.tapHint, { color: theme.primary }]}>Tap to view details →</Text>
		</View>
	</TouchableOpacity>
))

const CreateShopForm: React.FC<CreateShopFormProps> = React.memo(
	({
		visible,
		loading,
		shopNameEn,
		shopNameTnLatn,
		shopNameTnArab,
		deliveryRadius,
		onShopNameEnChange,
		onShopNameTnLatnChange,
		onShopNameTnArabChange,
		onDeliveryRadiusChange,
		onSubmit,
		onDismiss,
		theme
	}) => {
		const tnLatnInputRef = useRef<RNTextInput>(null)
		const tnArabInputRef = useRef<RNTextInput>(null)
		const deliveryRadiusInputRef = useRef<RNTextInput>(null)

		const isFormValid = shopNameEn.trim().length >= MIN_SHOP_NAME_LENGTH && shopNameEn.trim().length <= MAX_SHOP_NAME_LENGTH
		const deliveryRadiusNum = parseFloat(deliveryRadius) || 0
		const isDeliveryValid = deliveryRadiusNum > 0 && deliveryRadiusNum <= 100

		return (
			<Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
				<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
					<TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onDismiss} />
					<View style={[styles.modalContent, { backgroundColor: theme.card }]}>
						{/* Header */}
						<View style={styles.modalHeader}>
							<View style={[styles.modalIconContainer, { backgroundColor: theme.primary + '15' }]}>
								<Text style={styles.modalIcon}>🏪</Text>
							</View>
							<Text style={[styles.modalTitle, { color: theme.text }]}>Create New Shop</Text>
							<Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Set up your shop in multiple languages</Text>
						</View>

						<ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
							{/* English Name Input (Required) */}
							<View style={styles.inputContainer}>
								<View style={styles.inputLabelRow}>
									<Text style={[styles.inputLabel, { color: theme.text }]}>Shop Name (English)</Text>
									<Text style={[styles.required, { color: '#EF4444' }]}>*</Text>
								</View>
								<View
									style={[
										styles.inputWrapper,
										{
											borderColor: shopNameEn.length > 0 ? (isFormValid ? '#10B981' : '#EF4444') : theme.border,
											backgroundColor: theme.background
										}
									]}
								>
									<View style={[styles.inputIcon, { backgroundColor: theme.primary + '10' }]}>
										<Text style={{ fontSize: 18 }}>🇺🇸</Text>
									</View>
									<TextInput
										style={[styles.textInput, { color: theme.text, flex: 1 }]}
										value={shopNameEn}
										onChangeText={onShopNameEnChange}
										placeholder="e.g., Fresh Seafood Market"
										placeholderTextColor={theme.textSecondary}
										maxLength={MAX_SHOP_NAME_LENGTH}
										autoFocus
										returnKeyType="next"
										onSubmitEditing={() => tnLatnInputRef.current?.focus()}
									/>
								</View>
								<View style={styles.inputFooter}>
									<Text style={[styles.inputHint, { color: shopNameEn.length > 0 ? (isFormValid ? '#10B981' : '#EF4444') : theme.textSecondary }]}>
										{shopNameEn.length < MIN_SHOP_NAME_LENGTH && shopNameEn.length > 0
											? `At least ${MIN_SHOP_NAME_LENGTH} characters required`
											: shopNameEn.length > 0 && isFormValid
												? '✓ Looks good!'
												: 'English name is required'}
									</Text>
									<Text style={[styles.characterCount, { color: theme.textSecondary }]}>
										{shopNameEn.length}/{MAX_SHOP_NAME_LENGTH}
									</Text>
								</View>
							</View>

							{/* Tunisian Latin Name Input (Optional) */}
							<View style={styles.inputContainer}>
								<View style={styles.inputLabelRow}>
									<Text style={[styles.inputLabel, { color: theme.text }]}>Shop Name (Tunisian - Latin)</Text>
									<Text style={[styles.optional, { color: theme.textSecondary }]}>Optional</Text>
								</View>
								<View
									style={[
										styles.inputWrapper,
										{
											borderColor: theme.border,
											backgroundColor: theme.background
										}
									]}
								>
									<View style={[styles.inputIcon, { backgroundColor: theme.primary + '10' }]}>
										<View style={{ flexDirection: 'row', alignItems: 'center' }}>
											<Text style={{ fontSize: 14 }}>🇹🇳</Text>
											<Text style={{ fontSize: 12, marginLeft: 2, fontWeight: '600' }}>A</Text>
										</View>
									</View>
									<TextInput
										ref={tnLatnInputRef}
										style={[styles.textInput, { color: theme.text, flex: 1 }]}
										value={shopNameTnLatn}
										onChangeText={onShopNameTnLatnChange}
										placeholder="e.g., Souk el 7out"
										placeholderTextColor={theme.textSecondary}
										maxLength={MAX_SHOP_NAME_LENGTH}
										returnKeyType="next"
										onSubmitEditing={() => tnArabInputRef.current?.focus()}
									/>
								</View>
								<Text style={[styles.inputHint, { color: theme.textSecondary }]}>Tunisian name in Latin letters</Text>
							</View>

							{/* Tunisian Arabic Name Input (Optional) */}
							<View style={styles.inputContainer}>
								<View style={styles.inputLabelRow}>
									<Text style={[styles.inputLabel, { color: theme.text }]}>Shop Name (Tunisian - Arabic)</Text>
									<Text style={[styles.optional, { color: theme.textSecondary }]}>Optional</Text>
								</View>
								<View
									style={[
										styles.inputWrapper,
										{
											borderColor: theme.border,
											backgroundColor: theme.background
										}
									]}
								>
									<View style={[styles.inputIcon, { backgroundColor: theme.primary + '10' }]}>
										<View style={{ flexDirection: 'row', alignItems: 'center' }}>
											<Text style={{ fontSize: 14 }}>🇹🇳</Text>
											<Text style={{ fontSize: 12, marginLeft: 2, fontWeight: '600' }}>ع</Text>
										</View>
									</View>
									<TextInput
										ref={tnArabInputRef}
										style={[styles.textInput, { color: theme.text, flex: 1, textAlign: 'right' }]}
										value={shopNameTnArab}
										onChangeText={onShopNameTnArabChange}
										placeholder="مثال: سوق الحوت"
										placeholderTextColor={theme.textSecondary}
										maxLength={MAX_SHOP_NAME_LENGTH}
										returnKeyType="next"
										onSubmitEditing={() => deliveryRadiusInputRef.current?.focus()}
									/>
								</View>
								<Text style={[styles.inputHint, { color: theme.textSecondary }]}>Tunisian name in Arabic letters</Text>
							</View>

							{/* Delivery Radius Input */}
							<View style={styles.inputContainer}>
								<View style={styles.inputLabelRow}>
									<Text style={[styles.inputLabel, { color: theme.text }]}>Delivery Radius</Text>
									<Text style={[styles.required, { color: '#EF4444' }]}>*</Text>
								</View>
								<View
									style={[
										styles.inputWrapper,
										{
											borderColor: deliveryRadius.length > 0 ? (isDeliveryValid ? '#10B981' : '#EF4444') : theme.border,
											backgroundColor: theme.background
										}
									]}
								>
									<View style={[styles.inputIcon, { backgroundColor: theme.primary + '10' }]}>
										<Text style={{ fontSize: 18 }}>📍</Text>
									</View>
									<TextInput
										ref={deliveryRadiusInputRef}
										style={[styles.textInput, { color: theme.text, flex: 1 }]}
										value={deliveryRadius}
										onChangeText={onDeliveryRadiusChange}
										placeholder="5"
										placeholderTextColor={theme.textSecondary}
										keyboardType="decimal-pad"
										returnKeyType="done"
										onSubmitEditing={isFormValid && isDeliveryValid ? onSubmit : undefined}
									/>
									<Text style={[styles.unitLabel, { color: theme.textSecondary }]}>km</Text>
								</View>
								<Text style={[styles.inputHint, { color: deliveryRadius.length > 0 ? (isDeliveryValid ? '#10B981' : '#EF4444') : theme.textSecondary }]}>
									{deliveryRadius.length > 0 && !isDeliveryValid
										? 'Please enter a valid radius (1-100 km)'
										: deliveryRadius.length > 0 && isDeliveryValid
											? `✓ Delivery area: ~${(Math.PI * Math.pow(deliveryRadiusNum, 2)).toFixed(1)} km²`
											: 'How far will you deliver? (in kilometers)'}
								</Text>
							</View>

							{/* Info Card */}
							<View style={[styles.infoCard, { backgroundColor: theme.primary + '08', borderColor: theme.primary + '20' }]}>
								<Text style={[styles.infoIcon, { color: theme.primary }]}>💡</Text>
								<View style={{ flex: 1 }}>
									<Text style={[styles.infoTitle, { color: theme.text }]}>Multi-language Support</Text>
									<Text style={[styles.infoText, { color: theme.textSecondary }]}>
										Providing names in multiple languages helps customers find your shop more easily. You can update these later from shop settings.
									</Text>
								</View>
							</View>
						</ScrollView>

						{/* Action Buttons */}
						<View style={[styles.modalActions, { borderTopColor: theme.border }]}>
							<TouchableOpacity style={[styles.actionButton, styles.cancelButton, { borderColor: theme.border }]} onPress={onDismiss} disabled={loading}>
								<Text style={[styles.actionButtonText, { color: theme.text }]}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.actionButton,
									styles.createButton,
									{
										backgroundColor: isFormValid && isDeliveryValid ? theme.primary : theme.border,
										opacity: isFormValid && isDeliveryValid ? 1 : 0.5
									}
								]}
								onPress={onSubmit}
								disabled={!isFormValid || !isDeliveryValid || loading}
							>
								{loading ? (
									<ActivityIndicator color="#fff" size="small" />
								) : (
									<>
										<Text style={styles.createButtonText}>Create Shop</Text>
										<Text style={{ fontSize: 16 }}>→</Text>
									</>
								)}
							</TouchableOpacity>
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		)
	}
)

const MyShopsTab: React.FC<MyShopsTabProps> = ({ navigation }) => {
	const router = useRouter()
	const { colors } = useTheme()
	const [state, setState] = useState<ShopState>({
		shops: [],
		loading: true,
		refreshing: false,
		modalVisible: false,
		shopNameEn: '',
		shopNameTnLatn: '',
		shopNameTnArab: '',
		deliveryRadius: '5',
		creating: false,
		navigatingShopId: null,
		error: null
	})

	const { shops, loading, refreshing, modalVisible, shopNameEn, shopNameTnLatn, shopNameTnArab, deliveryRadius, creating, navigatingShopId, error } = state

	const updateState = useCallback((updates: Partial<ShopState>) => {
		setState((prev) => ({ ...prev, ...updates }))
	}, [])

	const loadShops = useCallback(
		async (showRefreshing = false) => {
			try {
				updateState(showRefreshing ? { refreshing: true } : { loading: true, error: null })
				const response = await getMyShops()
				// Access the shops array from the nested data property
				const shops = response?.data?.docs || []
				updateState({
					shops: shops.sort((a: Shop, b: Shop) => (a.name?.en || '').localeCompare(b.name?.en || '')),
					loading: false,
					refreshing: false,
					error: null
				})
			} catch (err) {
				console.error('Failed to load shops:', err)
				updateState({
					loading: false,
					refreshing: false,
					error: 'Failed to load shops. Please try again.'
				})
			}
		},
		[updateState]
	)

	const debouncedLoadShops = useMemo(() => debounce(loadShops, DEBOUNCE_DELAY), [loadShops])

	useFocusEffect(
		useCallback(() => {
			debouncedLoadShops(false)
			return () => debouncedLoadShops.cancel()
		}, [debouncedLoadShops])
	)

	const handleRefresh = useCallback(() => {
		debouncedLoadShops(true)
	}, [debouncedLoadShops])

	const handleCreateShop = useCallback(async () => {
		if (shopNameEn.trim().length < MIN_SHOP_NAME_LENGTH || shopNameEn.trim().length > MAX_SHOP_NAME_LENGTH) {
			return
		}

		try {
			updateState({ creating: true, error: null })

			const newShop: CreateShopRequest = {
				name: {
					en: shopNameEn.trim(),
					...(shopNameTnLatn.trim() && { tn_latn: shopNameTnLatn.trim() }),
					...(shopNameTnArab.trim() && { tn_arab: shopNameTnArab.trim() })
				},
				address: {
					street: '',
					city: '',
					state: '',
					postalCode: '',
					country: 'Tunisia'
				},
				location: {
					coordinates: undefined
				},
				deliveryRadiusKm: parseFloat(deliveryRadius) || 5
			}

			console.log('=== CREATE SHOP DEBUG ===')
			console.log('shopNameEn:', shopNameEn)
			console.log('shopNameTnLatn:', shopNameTnLatn)
			console.log('shopNameTnArab:', shopNameTnArab)
			console.log('newShop object:', newShop)
			console.log('newShop.name:', newShop.name)
			console.log('newShop.name type:', typeof newShop.name)
			console.log('newShop.name.en:', newShop.name.en)
			console.log('newShop stringified:', JSON.stringify(newShop, null, 2))
			console.log('========================')

			await createShop(newShop)
			await loadShops()
			updateState({
				modalVisible: false,
				shopNameEn: '',
				shopNameTnLatn: '',
				shopNameTnArab: '',
				deliveryRadius: '5',
				creating: false
			})
			Alert.alert('Success', 'Shop created successfully! You can update the address and location from shop settings.')
		} catch (err) {
			console.error('Failed to create shop:', err)
			updateState({
				creating: false,
				error: 'Failed to create shop. Please try again.'
			})
			Alert.alert('Error', 'Failed to create shop. Please try again.')
		}
	}, [shopNameEn, shopNameTnLatn, shopNameTnArab, deliveryRadius, updateState, loadShops])

	const handleShopPress = useCallback(
		(shop: Shop) => {
			if (!shop?._id) return

			updateState({ navigatingShopId: shop._id })

			// Navigate to the business shop details using expo-router
			if (router) {
				router.push({
					pathname: '/home/business/shops/[shopSlug]',
					params: { shopSlug: shop.slug }
				} as any)
			}

			// Reset navigation state after a delay in case navigation fails
			const timeoutId = setTimeout(() => {
				setState((prevState) => ({
					...prevState,
					navigatingShopId: null
				}))
			}, 5000)

			// Clean up the timeout if the component unmounts
			return () => clearTimeout(timeoutId)
		},
		[router, updateState]
	)

	const sortedShops = useMemo(() => {
		return [...shops].sort((a, b) => {
			// Sort by active status first, then by name
			if (a.isActive !== b.isActive) {
				return a.isActive ? -1 : 1
			}
			return (a.name?.en || '').localeCompare(b.name?.en || '')
		})
	}, [shops])

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<FlatList
				data={sortedShops}
				keyExtractor={(item) => item._id}
				contentContainerStyle={styles.listContent}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
				ListEmptyComponent={
					!loading && !refreshing ? (
						<View style={styles.emptyContainer}>
							<Text style={[styles.emptyText, { color: colors.textSecondary }]}>{error || 'No shops found. Create your first shop to get started.'}</Text>
							{error && (
								<TouchableOpacity onPress={() => loadShops()} style={[styles.retryButton, { borderColor: colors.primary }]}>
									<Text style={[styles.retryButtonText, { color: colors.primary }]}>Retry</Text>
								</TouchableOpacity>
							)}
						</View>
					) : null
				}
				renderItem={({ item }) => (
					<ShopItem
						shop={item}
						isNavigating={navigatingShopId === item._id}
						onPress={handleShopPress}
						theme={{
							primary: colors.primary,
							text: colors.text,
							textSecondary: colors.textSecondary,
							background: colors.background,
							card: colors.card || colors.background,
							border: colors.border || '#444'
						}}
					/>
				)}
			/>

			<TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => updateState({ modalVisible: true })}>
				<Text style={styles.fabText}>+</Text>
			</TouchableOpacity>

			<CreateShopForm
				visible={modalVisible}
				loading={creating}
				shopNameEn={shopNameEn}
				shopNameTnLatn={shopNameTnLatn}
				shopNameTnArab={shopNameTnArab}
				deliveryRadius={deliveryRadius}
				onShopNameEnChange={(text: string) => updateState({ shopNameEn: text })}
				onShopNameTnLatnChange={(text: string) => updateState({ shopNameTnLatn: text })}
				onShopNameTnArabChange={(text: string) => updateState({ shopNameTnArab: text })}
				onDeliveryRadiusChange={(text) => updateState({ deliveryRadius: text })}
				onSubmit={handleCreateShop}
				onDismiss={() =>
					updateState({
						modalVisible: false,
						shopNameEn: '',
						shopNameTnLatn: '',
						shopNameTnArab: '',
						deliveryRadius: '5',
						error: null
					})
				}
				theme={{
					primary: colors.primary,
					text: colors.text,
					textSecondary: colors.textSecondary,
					background: colors.background,
					card: colors.card || colors.background,
					border: colors.border || '#444'
				}}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	listContent: {
		padding: 16
	},
	card: {
		borderRadius: 8,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1
	},
	disabledCard: {
		opacity: 0.7
	},
	shopHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8
	},
	shopName: {
		fontSize: 18,
		fontWeight: '600'
	},
	meta: {
		fontSize: 14,
		marginBottom: 4
	},
	status: {
		fontSize: 14,
		fontWeight: '500',
		marginTop: 8
	},
	tapHint: {
		fontSize: 14,
		marginTop: 8,
		fontWeight: '500'
	},
	loadingIndicator: {
		marginLeft: 8
	},
	fab: {
		position: 'absolute',
		right: 20,
		bottom: 20,
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 2
	},
	fabText: {
		color: '#fff',
		fontSize: 24,
		lineHeight: 24
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
		justifyContent: 'flex-end'
	},
	modalBackdrop: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0
	},
	modalContent: {
		backgroundColor: '#fff',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		maxHeight: '90%',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.15,
		shadowRadius: 12,
		elevation: 8
	},
	modalHeader: {
		alignItems: 'center',
		paddingTop: 24,
		paddingHorizontal: 24,
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(0,0,0,0.05)'
	},
	modalIconContainer: {
		width: 64,
		height: 64,
		borderRadius: 32,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 16
	},
	modalIcon: {
		fontSize: 32
	},
	modalTitle: {
		fontSize: 24,
		fontWeight: '700',
		marginBottom: 8,
		textAlign: 'center'
	},
	modalSubtitle: {
		fontSize: 14,
		textAlign: 'center',
		lineHeight: 20
	},
	modalForm: {
		paddingHorizontal: 24,
		paddingVertical: 20
	},
	inputContainer: {
		marginBottom: 24
	},
	inputLabelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8
	},
	inputLabel: {
		fontSize: 15,
		fontWeight: '600'
	},
	required: {
		marginLeft: 4,
		fontSize: 15,
		fontWeight: '600'
	},
	optional: {
		marginLeft: 4,
		fontSize: 13,
		fontWeight: '500'
	},
	inputWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 2,
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 4
	},
	inputIcon: {
		width: 40,
		height: 40,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12
	},
	textInput: {
		fontSize: 16,
		paddingVertical: 12
	},
	unitLabel: {
		fontSize: 15,
		fontWeight: '600',
		marginLeft: 8
	},
	inputFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 6,
		paddingHorizontal: 4
	},
	inputHint: {
		fontSize: 12,
		flex: 1,
		marginRight: 8
	},
	characterCount: {
		fontSize: 12,
		fontWeight: '500'
	},
	infoCard: {
		flexDirection: 'row',
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		gap: 12,
		marginTop: 8
	},
	infoIcon: {
		fontSize: 20
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
	modalActions: {
		flexDirection: 'row',
		gap: 12,
		padding: 20,
		borderTopWidth: 1,
		backgroundColor: 'rgba(0,0,0,0.02)'
	},
	actionButton: {
		flex: 1,
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		gap: 8
	},
	cancelButton: {
		borderWidth: 2,
		backgroundColor: 'transparent'
	},
	createButton: {
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 4
	},
	actionButtonText: {
		fontSize: 16,
		fontWeight: '600'
	},
	createButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '700'
	},
	input: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 4,
		padding: 10,
		marginBottom: 16
	},
	modalButtons: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		marginTop: 16
	},
	modalButton: {
		padding: 10,
		marginLeft: 10,
		minWidth: 80,
		alignItems: 'center',
		borderRadius: 4
	},
	modalButtonText: {
		fontWeight: '500'
	},
	errorText: {
		color: '#f44336',
		marginBottom: 16
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20
	},
	emptyText: {
		textAlign: 'center',
		marginBottom: 16
	},
	retryButton: {
		borderWidth: 1,
		borderRadius: 4,
		paddingHorizontal: 16,
		paddingVertical: 8
	},
	retryButtonText: {
		fontWeight: '500'
	}
})

export default MyShopsTab
