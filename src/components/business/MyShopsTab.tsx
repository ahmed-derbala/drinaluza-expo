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
import { getMyShops, createShop } from '@/components/shops/shops.api'
import { Shop, CreateShopRequest } from '@/components/shops/shops.interface'

type ShopsStackParamList = {
	ShopDetails: { shopId: string }
	// Add other screens in the shops stack here
}

type MyShopsTabNavigationProp = NativeStackNavigationProp<ShopsStackParamList, 'ShopDetails'>

interface MyShopsTabProps {
	navigation?: MyShopsTabNavigationProp
}
import { useFocusEffect } from '@react-navigation/native'
import { useTheme } from '@/contexts/ThemeContext'
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

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
			<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
				<View style={[styles.modalContent, { backgroundColor: theme.card }]}>
					<Text style={[styles.modalTitle, { color: theme.text }]}>Create New Shop</Text>

					<Text style={[styles.inputLabel, { color: theme.text }]}>Shop Name</Text>
					<TextInput
						style={[
							styles.input,
							{
								borderColor: theme.border,
								color: theme.text,
								backgroundColor: theme.background
							}
						]}
						value={shopName}
						onChangeText={onShopNameChange}
						placeholder="Enter shop name"
						placeholderTextColor={theme.textSecondary}
						maxLength={MAX_SHOP_NAME_LENGTH}
						autoFocus
						returnKeyType="next"
						onSubmitEditing={() => deliveryRadiusInputRef.current?.focus()}
					/>
					<Text style={[styles.characterCount, { color: theme.textSecondary }]}>
						{shopName.length}/{MAX_SHOP_NAME_LENGTH}
					</Text>

					<Text style={[styles.inputLabel, { color: theme.text }]}>Delivery Radius (km)</Text>
					<TextInput
						ref={deliveryRadiusInputRef}
						style={[
							styles.input,
							{
								borderColor: theme.border,
								color: theme.text,
								backgroundColor: theme.background
							}
						]}
						value={deliveryRadius}
						onChangeText={onDeliveryRadiusChange}
						placeholder="Enter delivery radius in kilometers"
						placeholderTextColor={theme.textSecondary}
						keyboardType="numeric"
						returnKeyType="done"
						onSubmitEditing={onSubmit}
					/>

					<View style={styles.modalButtons}>
						<TouchableOpacity style={[styles.modalButton, { borderWidth: 1, borderColor: theme.border }]} onPress={onDismiss} disabled={loading}>
							<Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.modalButton,
								{
									backgroundColor: isFormValid ? theme.primary : '#999',
									opacity: isFormValid ? 1 : 0.6
								}
							]}
							onPress={onSubmit}
							disabled={!isFormValid || loading}
						>
							{loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.modalButtonText, { color: '#fff' }]}>Create Shop</Text>}
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
				// Extract the shops array from the nested data property
				const shops = Array.isArray(response.data?.data) ? response.data.data : []
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
		} catch (err) {
			console.error('Failed to create shop:', err)
			updateState({
				error: 'Failed to create shop. Please try again.'
			})
		}
	}, [shopName, deliveryRadius, updateState, loadShops])

	const handleShopPress = useCallback(
		(shop: Shop) => {
			if (!shop?._id) return

			updateState({ navigatingShopId: shop._id })

			// Navigate to the shop details using expo-router
			if (router) {
				router.push({
					pathname: '/(tabs)/home/shops/[shopId]',
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
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		padding: 20
	},
	modalContent: {
		backgroundColor: '#fff',
		borderRadius: 8,
		padding: 20,
		maxHeight: '80%'
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: '600',
		marginBottom: 20,
		textAlign: 'center'
	},
	input: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 4,
		padding: 10,
		marginBottom: 16
	},
	inputLabel: {
		marginBottom: 8,
		fontWeight: '500'
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
	characterCount: {
		textAlign: 'right',
		fontSize: 12,
		color: '#666',
		marginTop: -12,
		marginBottom: 8
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
