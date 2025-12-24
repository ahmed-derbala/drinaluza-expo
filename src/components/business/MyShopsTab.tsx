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
	shopName: string
	deliveryRadius: string
	onShopNameChange: (text: string) => void
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
	shopName: string
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
				<Text style={[styles.shopName, { color: theme.text }]}>{shop.name || 'Unnamed Shop'}</Text>
				{isNavigating && <ActivityIndicator size="small" color={theme.primary} style={styles.loadingIndicator} />}
			</View>
			{shop.owner && (
				<Text style={[styles.meta, { color: theme.textSecondary }]}>
					Owner: {shop.owner.name} (@{shop.owner.slug})
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

const CreateShopForm: React.FC<CreateShopFormProps> = React.memo(({ visible, loading, shopName, deliveryRadius, onShopNameChange, onDeliveryRadiusChange, onSubmit, onDismiss, theme }) => {
	const deliveryRadiusInputRef = useRef<RNTextInput>(null)
	const isFormValid = shopName.trim().length >= MIN_SHOP_NAME_LENGTH && shopName.trim().length <= MAX_SHOP_NAME_LENGTH
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
						<Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Set up your shop to start selling</Text>
					</View>

					<ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
						{/* Shop Name Input */}
						<View style={styles.inputContainer}>
							<View style={styles.inputLabelRow}>
								<Text style={[styles.inputLabel, { color: theme.text }]}>Shop Name</Text>
								<Text style={[styles.required, { color: '#EF4444' }]}>*</Text>
							</View>
							<View
								style={[
									styles.inputWrapper,
									{
										borderColor: shopName.length > 0 ? (isFormValid ? '#10B981' : '#EF4444') : theme.border,
										backgroundColor: theme.background
									}
								]}
							>
								<View style={[styles.inputIcon, { backgroundColor: theme.primary + '10' }]}>
									<Text style={{ fontSize: 18 }}>🏪</Text>
								</View>
								<TextInput
									style={[styles.textInput, { color: theme.text, flex: 1 }]}
									value={shopName}
									onChangeText={onShopNameChange}
									placeholder="e.g., Fresh Seafood Market"
									placeholderTextColor={theme.textSecondary}
									maxLength={MAX_SHOP_NAME_LENGTH}
									autoFocus
									returnKeyType="next"
									onSubmitEditing={() => deliveryRadiusInputRef.current?.focus()}
								/>
							</View>
							<View style={styles.inputFooter}>
								<Text style={[styles.inputHint, { color: shopName.length > 0 ? (isFormValid ? '#10B981' : '#EF4444') : theme.textSecondary }]}>
									{shopName.length < MIN_SHOP_NAME_LENGTH && shopName.length > 0
										? `At least ${MIN_SHOP_NAME_LENGTH} characters required`
										: shopName.length > 0 && isFormValid
											? '✓ Looks good!'
											: 'Choose a unique name for your shop'}
								</Text>
								<Text style={[styles.characterCount, { color: theme.textSecondary }]}>
									{shopName.length}/{MAX_SHOP_NAME_LENGTH}
								</Text>
							</View>
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
								<Text style={[styles.infoTitle, { color: theme.text }]}>Quick Tip</Text>
								<Text style={[styles.infoText, { color: theme.textSecondary }]}>You can always update your shop details later from the shop settings.</Text>
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
})

const MyShopsTab: React.FC<MyShopsTabProps> = ({ navigation }) => {
	const router = useRouter()
	const { colors } = useTheme()
	const [state, setState] = useState<ShopState>({
		shops: [],
		loading: true,
		refreshing: false,
		modalVisible: false,
		shopName: '',
		deliveryRadius: '5',
		creating: false,
		navigatingShopId: null,
		error: null
	})

	const { shops, loading, refreshing, modalVisible, shopName, deliveryRadius, creating, navigatingShopId, error } = state

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
					shops: shops.sort((a: Shop, b: Shop) => a.name.localeCompare(b.name)),
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
		if (shopName.trim().length < MIN_SHOP_NAME_LENGTH || shopName.trim().length > MAX_SHOP_NAME_LENGTH) {
			return
		}

		try {
			updateState({ creating: true, error: null })

			const newShop: CreateShopRequest = {
				name: shopName.trim(),
				address: {
					street: 'To be updated',
					city: 'To be updated',
					state: 'To be updated',
					postalCode: '0000',
					country: 'Tunisia'
				},
				location: {
					coordinates: [10.1815, 36.8065] // Default to Tunisia coordinates
				},
				deliveryRadiusKm: parseFloat(deliveryRadius) || 5
			}

			await createShop(newShop)
			await loadShops()
			updateState({
				modalVisible: false,
				shopName: '',
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
	}, [shopName, deliveryRadius, updateState, loadShops])

	const handleShopPress = useCallback(
		(shop: Shop) => {
			if (!shop?._id) return

			updateState({ navigatingShopId: shop._id })

			// Navigate to the shop details using expo-router
			if (router) {
				router.push({
					pathname: '/home/shops/[shopId]',
					params: { shopId: shop._id }
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
			return a.name.localeCompare(b.name)
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
				shopName={shopName}
				deliveryRadius={deliveryRadius}
				onShopNameChange={(text) => updateState({ shopName: text })}
				onDeliveryRadiusChange={(text) => updateState({ deliveryRadius: text })}
				onSubmit={handleCreateShop}
				onDismiss={() =>
					updateState({
						modalVisible: false,
						shopName: '',
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
