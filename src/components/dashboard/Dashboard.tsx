import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform, Dimensions, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { MaterialIcons, Ionicons, Feather, FontAwesome5 } from '@expo/vector-icons'
import { useTheme } from '../../core/contexts/ThemeContext'
import ScreenHeader from '../common/ScreenHeader'
import { getPurchases } from '../orders/orders.api'
import { OrderItem } from '../orders/orders.interface'
import { orderStatusEnum, orderStatusColors, orderStatusLabels } from '../../config/orderStatus'
import { parseError, logError } from '../../core/helpers/errorHandler'
import ErrorState from '../common/ErrorState'
import { useUser } from '../../core/contexts/UserContext'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import { secureGetItem } from '../../core/auth/storage'
import { getMyBusinesses } from '../businesses/businesses.api'
import { Business } from '../businesses/businesses.interface'

type Order = OrderItem

const { width } = Dimensions.get('window')
const COLUMN_WIDTH = (width - 44) / 2

type StatCardProps = {
	title: string
	value: string | number
	icon: React.ReactNode
	accent: string
	onPress?: () => void
}

type ActionButtonProps = {
	icon: React.ReactNode
	onPress: () => void
	color: string
	count?: number
}

const Dashboard = () => {
	const { colors } = useTheme()
	const styles = useMemo(() => createStyles(colors), [colors])
	const { localize, formatPrice, translate, currency, user } = useUser()
	const router = useRouter()
	const { onScroll } = useScrollHandler()

	const [userRole, setUserRole] = useState<string | null>(null)
	const [refreshing, setRefreshing] = useState(false)
	const [loading, setLoading] = useState(true)
	const [stats, setStats] = useState({
		totalPurchases: 0,
		pendingPurchases: 0,
		completedPurchases: 0,
		totalSpent: 0
	})
	const [recentPurchases, setRecentPurchases] = useState<Order[]>([])
	const [myBusinesses, setMyBusinesses] = useState<Business[]>([])
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)

	const isOwner = userRole === 'shop_owner'

	useEffect(() => {
		const loadRole = async () => {
			try {
				const storedUserData = await secureGetItem('userData')
				if (storedUserData) {
					const userData = JSON.parse(storedUserData)
					setUserRole(userData.role || null)
				}
			} catch {
				setUserRole(null)
			}
		}
		loadRole()
	}, [])

	const StatCard = ({ title, value, icon, accent, onPress }: StatCardProps) => (
		<TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.statCard, { borderColor: colors.info || '#3B82F6', backgroundColor: colors.card }]}>
			<LinearGradient colors={[`${accent}15`, `${accent}05`]} style={styles.statGradient} />
			<View style={[styles.statIcon, { backgroundColor: `${accent}20` }]}>{icon}</View>
			<View style={styles.statBody}>
				<Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
				<Text style={[styles.statLabel, { color: colors.textSecondary }]}>{title}</Text>
			</View>
		</TouchableOpacity>
	)

	const ActionButton = ({ icon, onPress, color, count }: ActionButtonProps) => (
		<View style={styles.actionItem}>
			<TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
				<View style={[styles.actionIconInner, { backgroundColor: `${color}15` }]}>{icon}</View>
				{count !== undefined && count > 0 && (
					<View style={[styles.countBadge, { backgroundColor: color }]}>
						<Text style={styles.countBadgeText}>{count}</Text>
					</View>
				)}
			</TouchableOpacity>
		</View>
	)

	const loadDashboard = useCallback(async () => {
		try {
			setLoading(true)
			setError(null)

			const purchasesPromise = getPurchases()
			const businessesPromise = isOwner ? getMyBusinesses() : Promise.resolve(null)

			const [purchasesResponse, businessesResponse] = await Promise.all([purchasesPromise, businessesPromise])

			const docs = purchasesResponse.data.docs || []
			const totalSpent = docs.reduce((acc, order) => {
				const amount = order.price?.total?.[currency as keyof typeof order.price.total] || order.price?.total?.tnd || 0
				return acc + (typeof amount === 'number' ? amount : 0)
			}, 0)
			const pendingCount = docs.filter((o) => o.status === orderStatusEnum.PENDING_SHOP_CONFIRMATION).length
			const completedCount = docs.filter((o) => [orderStatusEnum.DELIVERED_TO_CUSTOMER, orderStatusEnum.RECEIVED_BY_CUSTOMER].includes(o.status)).length

			setStats({
				totalPurchases: docs.length,
				pendingPurchases: pendingCount,
				completedPurchases: completedCount,
				totalSpent
			})
			setRecentPurchases(docs.slice(0, 5))

			if (businessesResponse) {
				setMyBusinesses(businessesResponse.data?.docs || [])
			}
		} catch (err: any) {
			logError(err, 'loadDashboard')
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
	}, [currency, isOwner])

	useEffect(() => {
		loadDashboard()
	}, [loadDashboard])

	const onRefresh = useCallback(() => {
		setRefreshing(true)
		loadDashboard()
	}, [loadDashboard])

	const getStatusColor = useCallback((status: string) => orderStatusColors[status] || colors.textSecondary, [colors])

	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		const now = new Date()
		const diffTime = Math.abs(now.getTime() - date.getTime())
		const diffMinutes = Math.floor(diffTime / (1000 * 60))
		const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

		if (diffMinutes < 60) return `${diffMinutes}m ${translate('ago', 'ago')}`
		if (diffHours < 24) return `${diffHours}h ${translate('ago', 'ago')}`
		if (diffDays < 7) return `${diffDays}d ${translate('ago', 'ago')}`
		return date.toLocaleDateString()
	}

	const getOrderBusinessName = (order: Order) => {
		const entity = order.business || (order as any).business
		return entity?.name ? localize(entity.name) : translate('unknown', 'Unknown')
	}

	const statCards = useMemo(
		() => [
			{
				title: translate('dashboard.total_spent', 'Total Spent'),
				value: formatPrice({ total: { [currency]: stats.totalSpent } }),
				icon: <MaterialIcons name="payments" size={24} color={colors.primary} />,
				accent: colors.primary,
				onPress: () => router.push('/(home)/purchases' as any)
			},
			{
				title: translate('dashboard.purchases', 'Purchases'),
				value: stats.totalPurchases,
				icon: <MaterialIcons name="shopping-bag" size={24} color={colors.info} />,
				accent: colors.info,
				onPress: () => router.push('/(home)/purchases' as any)
			},
			{
				title: translate('dashboard.pending', 'Pending'),
				value: stats.pendingPurchases,
				icon: <MaterialIcons name="schedule" size={24} color={colors.warning} />,
				accent: colors.warning,
				onPress: () => router.push({ pathname: '/(home)/purchases', params: { filter: 'pending' } } as any)
			},
			{
				title: translate('dashboard.completed', 'Completed'),
				value: stats.completedPurchases,
				icon: <MaterialIcons name="check-circle" size={24} color={colors.success} />,
				accent: colors.success,
				onPress: () => router.push({ pathname: '/(home)/purchases', params: { filter: 'completed' } } as any)
			}
		],
		[colors, router, stats, currency, formatPrice, translate]
	)

	const customerActions = useMemo(
		() => [
			{
				icon: <MaterialIcons name="storefront" size={26} color={colors.primary} />,
				color: colors.primary,
				onPress: () => router.push('/(home)/businesses' as any)
			},
			{
				icon: <Feather name="package" size={26} color={colors.info} />,
				color: colors.info,
				onPress: () => router.push('/(home)/purchases' as any)
			},
			{
				icon: <Feather name="tag" size={26} color={colors.success} />,
				color: colors.success,
				onPress: () => router.push('/(home)/feed' as any)
			},
			{
				icon: <Feather name="settings" size={26} color={colors.textTertiary} />,
				color: colors.textTertiary,
				onPress: () => router.push('/(home)/settings' as any)
			}
		],
		[colors, router]
	)

	const ownerActions = useMemo(
		() => [
			{
				icon: <MaterialIcons name="store" size={26} color={colors.primary} />,
				color: colors.primary,
				count: myBusinesses.length,
				onPress: () => router.push('/(home)/business/my-businesses' as any)
			},
			{
				icon: <MaterialIcons name="inventory" size={26} color={colors.success} />,
				color: colors.success,
				onPress: () => router.push('/(home)/business/my-products' as any)
			},
			{
				icon: <MaterialIcons name="receipt-long" size={26} color={colors.info} />,
				color: colors.info,
				onPress: () => router.push('/(home)/business/sales' as any)
			},
			{
				icon: <MaterialIcons name="add-business" size={26} color={colors.warning} />,
				color: colors.warning,
				onPress: () => router.push('/(home)/business/create-product' as any)
			}
		],
		[colors, router, myBusinesses.length]
	)

	const featuredBusiness = myBusinesses[0]

	if (loading && !refreshing) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScreenHeader
				title={translate('dashboard', 'Dashboard')}
				subtitle={user ? `${translate('dashboard.welcome', 'Welcome back')}, ${localize(user.name)}` : translate('dashboard.welcome', 'Welcome back')}
				showBack={false}
				rightActions={
					<TouchableOpacity onPress={onRefresh} style={styles.headerIcon} accessibilityLabel="Refresh dashboard">
						<Ionicons name={refreshing ? 'hourglass' : 'refresh'} size={22} color={colors.text} />
					</TouchableOpacity>
				}
			/>

			{error && recentPurchases.length === 0 && !isOwner ? (
				<ErrorState
					title={error.title}
					message={error.message}
					onRetry={loadDashboard}
					icon={error.type === 'network' || error.type === 'timeout' ? 'cloud-offline-outline' : 'alert-circle-outline'}
				/>
			) : (
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					refreshControl={<RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
					showsVerticalScrollIndicator={false}
					onScroll={onScroll}
					scrollEventThrottle={16}
				>
					{isOwner && featuredBusiness && (
						<View style={styles.section}>
							<LinearGradient colors={[colors.primaryContainer, colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
								<View style={styles.heroInfo}>
									<View style={[styles.statusBadge, { backgroundColor: featuredBusiness.state?.code === 'active' ? colors.success + '20' : colors.warning + '20' }]}>
										<View style={[styles.statusDot, { backgroundColor: featuredBusiness.state?.code === 'active' ? colors.success : colors.warning }]} />
										<Text style={[styles.statusText, { color: featuredBusiness.state?.code === 'active' ? colors.success : colors.warning }]}>
											{(featuredBusiness.state?.code || 'unknown').toUpperCase()}
										</Text>
									</View>
									<Text style={[styles.businessName, { color: colors.text }]}>{localize(featuredBusiness.name)}</Text>
									<Text style={[styles.businessSlug, { color: colors.textSecondary }]}>@{featuredBusiness.slug}</Text>
								</View>
								<FontAwesome5 name="anchor" size={36} color={colors.primary} style={{ opacity: 0.5 }} />
							</LinearGradient>
						</View>
					)}

					{isOwner && (
						<View style={styles.section}>
							<View style={styles.sectionHeader}>
								<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('dashboard.management', 'Management')}</Text>
							</View>
							<View style={styles.actionsRow}>
								{ownerActions.map((action, index) => (
									<ActionButton key={index} {...action} />
								))}
							</View>
						</View>
					)}

					<View style={styles.section}>
						<View style={styles.sectionHeader}>
							<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('dashboard.overview', 'Overview')}</Text>
						</View>
						<View style={styles.statsGrid}>
							{statCards.map((card) => (
								<StatCard key={card.title} {...card} />
							))}
						</View>
					</View>

					<View style={styles.section}>
						<View style={styles.sectionHeader}>
							<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('dashboard.quick_actions', 'Quick Actions')}</Text>
						</View>
						<View style={styles.actionsRow}>
							{customerActions.map((action, index) => (
								<ActionButton key={index} {...action} />
							))}
						</View>
					</View>

					<View style={styles.section}>
						<View style={styles.sectionHeader}>
							<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('dashboard.recent_purchases', 'Recent Purchases')}</Text>
							<TouchableOpacity onPress={() => router.push('/(home)/purchases' as any)} style={styles.iconButton}>
								<Ionicons name="chevron-forward" size={20} color={colors.primary} />
							</TouchableOpacity>
						</View>
						<View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.info || '#3B82F6' }]}>
							{recentPurchases.length === 0 ? (
								<View style={styles.emptyState}>
									<View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
										<Feather name="shopping-bag" size={32} color={colors.textTertiary} />
									</View>
									<Text style={[styles.emptyText, { color: colors.textSecondary }]}>{translate('dashboard.no_purchases', 'No purchases yet')}</Text>
									<Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>{translate('dashboard.browse_businesses_sub', 'Browse businesses to place your first purchase')}</Text>
								</View>
							) : (
								recentPurchases.map((purchase, index) => (
									<TouchableOpacity
										key={purchase._id}
										style={[styles.purchaseRow, { borderColor: colors.border }, index === recentPurchases.length - 1 && { borderBottomWidth: 0 }]}
										onPress={() => router.push('/(home)/purchases' as any)}
										activeOpacity={0.8}
									>
										<View style={[styles.purchaseIcon, { backgroundColor: `${colors.primary}10` }]}>
											<MaterialIcons name="store" size={20} color={colors.primary} />
										</View>
										<View style={styles.purchaseMeta}>
											<Text style={[styles.purchaseTitle, { color: colors.text }]} numberOfLines={1}>
												{getOrderBusinessName(purchase)}
											</Text>
											<Text style={[styles.purchaseDate, { color: colors.textSecondary }]}>{formatDate(purchase.createdAt)}</Text>
										</View>
										<View style={styles.purchaseRight}>
											<Text style={[styles.purchaseAmount, { color: colors.text }]}>{formatPrice(purchase.price)}</Text>
											<View style={[styles.statusBadgeSmall, { backgroundColor: `${getStatusColor(purchase.status)}15` }]}>
												<Text style={[styles.statusTextSmall, { color: getStatusColor(purchase.status) }]}>
													{translate(`status_${purchase.status}`, orderStatusLabels[purchase.status] || purchase.status)}
												</Text>
											</View>
										</View>
									</TouchableOpacity>
								))
							)}
						</View>
					</View>
				</ScrollView>
			)}
		</View>
	)
}

const createStyles = (colors: any) =>
	StyleSheet.create({
		container: { flex: 1 },
		scrollContent: { paddingHorizontal: 16, paddingBottom: 28, paddingTop: 8 },
		section: { marginBottom: 24 },
		sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
		sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.5 },
		statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
		statCard: {
			width: COLUMN_WIDTH,
			borderRadius: 20,
			padding: 16,
			borderWidth: 1,
			overflow: 'hidden',
			...Platform.select({
				ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
				android: { elevation: 3 }
			})
		},
		statGradient: { ...StyleSheet.absoluteFillObject },
		statIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
		statBody: { gap: 2 },
		statValue: { fontSize: 20, fontWeight: '700' },
		statLabel: { fontSize: 12, fontWeight: '500' },
		actionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
		actionItem: { alignItems: 'center', width: (width - 32) / 4, gap: 8 },
		actionButton: {
			width: 60,
			height: 60,
			borderRadius: 20,
			borderWidth: 1,
			justifyContent: 'center',
			alignItems: 'center',
			...Platform.select({
				ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
				android: { elevation: 2 }
			})
		},
		actionIconInner: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
		countBadge: {
			position: 'absolute',
			top: -4,
			right: -4,
			paddingHorizontal: 6,
			paddingVertical: 2,
			borderRadius: 10,
			minWidth: 20,
			alignItems: 'center'
		},
		countBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
		panel: { borderRadius: 24, borderWidth: 1, padding: 8 },
		purchaseRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, gap: 12 },
		purchaseIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
		purchaseMeta: { flex: 1 },
		purchaseTitle: { fontSize: 15, fontWeight: '600' },
		purchaseDate: { fontSize: 12, marginTop: 2 },
		purchaseRight: { alignItems: 'flex-end' },
		purchaseAmount: { fontSize: 15, fontWeight: '700' },
		statusBadgeSmall: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
		statusTextSmall: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
		headerIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
		iconButton: { padding: 4 },
		emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
		emptyIconContainer: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
		emptyText: { fontSize: 16, fontWeight: '700' },
		emptySubtext: { fontSize: 14, textAlign: 'center', maxWidth: '80%', lineHeight: 20 },
		heroCard: {
			borderRadius: 24,
			padding: 20,
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			borderWidth: 1,
			borderColor: 'rgba(255,255,255,0.05)'
		},
		heroInfo: { flex: 1 },
		statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 6, marginBottom: 8 },
		statusDot: { width: 6, height: 6, borderRadius: 3 },
		statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
		businessName: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
		businessSlug: { fontSize: 14, fontWeight: '500' }
	})

export default Dashboard
