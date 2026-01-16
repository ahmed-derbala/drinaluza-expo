import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { MaterialIcons, Ionicons, Feather, FontAwesome5 } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'
import ScreenHeader from '../common/ScreenHeader'
import { getPurchases } from '../orders/orders.api'
import { OrderItem } from '../orders/orders.interface'
import { orderStatusEnum, orderStatusColors, orderStatusLabels } from '../../constants/orderStatus'
import { logError, parseError } from '../../utils/errorHandler'
import ErrorState from '../common/ErrorState'
import { useUser } from '../../contexts/UserContext'

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
}

const Dashboard = () => {
	const { colors } = useTheme()
	const styles = useMemo(() => createStyles(colors), [colors])
	const { localize, formatPrice, translate, currency, user } = useUser()
	const router = useRouter()

	const StatCard = ({ title, value, icon, accent, onPress }: StatCardProps) => {
		return (
			<TouchableOpacity
				activeOpacity={0.9}
				onPress={onPress}
				style={[
					styles.statCard,
					{
						borderColor: colors.border,
						backgroundColor: colors.card
					}
				]}
			>
				<LinearGradient colors={[`${accent}15`, `${accent}05`]} style={styles.statGradient} />
				<View style={[styles.statIcon, { backgroundColor: `${accent}20` }]}>{icon}</View>
				<View style={styles.statBody}>
					<Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
					<Text style={[styles.statLabel, { color: colors.textSecondary }]}>{title}</Text>
				</View>
			</TouchableOpacity>
		)
	}

	const ActionButton = ({ icon, onPress, color }: ActionButtonProps) => {
		return (
			<View style={styles.actionItem}>
				<TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
					<View style={[styles.actionIconInner, { backgroundColor: `${color}15` }]}>{icon}</View>
				</TouchableOpacity>
			</View>
		)
	}

	const [refreshing, setRefreshing] = useState(false)
	const [loading, setLoading] = useState(true)
	const [stats, setStats] = useState({
		totalPurchases: 0,
		pendingPurchases: 0,
		completedPurchases: 0,
		totalSpent: 0
	})
	const [recentPurchases, setRecentPurchases] = useState<Order[]>([])
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)

	const loadDashboard = useCallback(async () => {
		try {
			setLoading(true)
			setError(null)
			const response = await getPurchases()
			const docs = response.data.docs || []

			// Calculate stats from data
			const totalSpent = docs.reduce((acc, order) => {
				// @ts-ignore
				const amount = order.price?.total?.[currency as any] || order.price?.total?.tnd || order.price?.total || 0
				return acc + (typeof amount === 'number' ? amount : 0)
			}, 0)
			const pendingCount = docs.filter((o) => o.status === orderStatusEnum.PENDING_SHOP_CONFIRMATION).length
			const completedCount = docs.filter((o) => [orderStatusEnum.DELIVERED_TO_CUSTOMER, orderStatusEnum.RECEIVED_BY_CUSTOMER].includes(o.status)).length

			setStats({
				totalPurchases: docs.length,
				pendingPurchases: pendingCount,
				completedPurchases: completedCount,
				totalSpent: totalSpent
			})

			setRecentPurchases(docs.slice(0, 5))
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
	}, [currency])

	useEffect(() => {
		loadDashboard()
	}, [loadDashboard])

	const onRefresh = useCallback(() => {
		setRefreshing(true)
		loadDashboard()
	}, [loadDashboard])

	const getStatusColor = useCallback(
		(status: string) => {
			return orderStatusColors[status] || colors.textSecondary
		},
		[colors]
	)

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

	const statCards = useMemo(
		() => [
			{
				title: translate('dashboard.total_spent', 'Total Spent'),
				value: formatPrice({ total: { [currency]: stats.totalSpent } }),
				icon: <MaterialIcons name="payments" size={24} color={colors.primary} />,
				accent: colors.primary,
				onPress: () => router.push('/home/purchases' as any)
			},
			{
				title: translate('dashboard.purchases', 'Purchases'),
				value: stats.totalPurchases,
				icon: <MaterialIcons name="shopping-bag" size={24} color={colors.info} />,
				accent: colors.info,
				onPress: () => router.push('/home/purchases' as any)
			},
			{
				title: translate('dashboard.pending', 'Pending'),
				value: stats.pendingPurchases,
				icon: <MaterialIcons name="schedule" size={24} color={colors.warning} />,
				accent: colors.warning,
				onPress: () => router.push({ pathname: '/home/purchases', params: { filter: 'pending' } } as any)
			},
			{
				title: translate('dashboard.completed', 'Completed'),
				value: stats.completedPurchases,
				icon: <MaterialIcons name="check-circle" size={24} color={colors.success} />,
				accent: colors.success,
				onPress: () => router.push({ pathname: '/home/purchases', params: { filter: 'completed' } } as any)
			}
		],
		[colors.primary, colors.success, colors.warning, colors.info, router, stats, currency, formatPrice, translate]
	)

	const actions = useMemo(
		() => [
			{
				icon: <MaterialIcons name="storefront" size={26} color={colors.primary} />,
				color: colors.primary,
				onPress: () => router.push('/home/shops' as any)
			},
			{
				icon: <Feather name="package" size={26} color={colors.info} />,
				color: colors.info,
				onPress: () => router.push('/home/purchases' as any)
			},
			{
				icon: <Feather name="tag" size={26} color={colors.success} />,
				color: colors.success,
				onPress: () => router.push('/home/feed' as any)
			},
			{
				icon: <Feather name="settings" size={26} color={colors.textTertiary} />,
				color: colors.textTertiary,
				onPress: () => router.push('/home/settings' as any)
			}
		],
		[colors.info, colors.primary, colors.success, colors.textTertiary, router]
	)

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

			{error && recentPurchases.length === 0 ? (
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
				>
					{/* Overview Section */}
					<View style={styles.section}>
						<View style={styles.statsGrid}>
							{statCards.map((card) => (
								<StatCard key={card.title} {...card} />
							))}
						</View>
					</View>

					{/* Quick Actions - Icon Centric */}
					<View style={styles.section}>
						<View style={styles.sectionHeader}>
							<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('dashboard.quick_actions', 'Quick Actions')}</Text>
						</View>
						<View style={styles.actionsRow}>
							{actions.map((action, index) => (
								<ActionButton key={index} {...action} />
							))}
						</View>
					</View>

					{/* Recent Purchases */}
					<View style={styles.section}>
						<View style={styles.sectionHeader}>
							<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('dashboard.recent_purchases', 'Recent Purchases')}</Text>
							<TouchableOpacity onPress={() => router.push('/home/purchases' as any)} style={styles.iconButton}>
								<Ionicons name="chevron-forward" size={20} color={colors.primary} />
							</TouchableOpacity>
						</View>
						<View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
							{recentPurchases.length === 0 ? (
								<View style={styles.emptyState}>
									<View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
										<Feather name="shopping-bag" size={32} color={colors.textTertiary} />
									</View>
									<Text style={[styles.emptyText, { color: colors.textSecondary }]}>{translate('dashboard.no_purchases', 'No purchases yet')}</Text>
									<Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>{translate('dashboard.browse_shops_sub', 'Browse shops to place your first purchase')}</Text>
								</View>
							) : (
								recentPurchases.map((purchase, index) => (
									<TouchableOpacity
										key={purchase._id}
										style={[styles.purchaseRow, { borderColor: colors.border }, index === recentPurchases.length - 1 && { borderBottomWidth: 0 }]}
										onPress={() => router.push('/home/purchases' as any)}
										activeOpacity={0.8}
									>
										<View style={[styles.purchaseIcon, { backgroundColor: `${colors.primary}10` }]}>
											<MaterialIcons name="store" size={20} color={colors.primary} />
										</View>
										<View style={styles.purchaseMeta}>
											<Text style={[styles.purchaseTitle, { color: colors.text }]} numberOfLines={1}>
												{localize(purchase.shop.name)}
											</Text>
											<Text style={[styles.purchaseDate, { color: colors.textSecondary }]}>{formatDate(purchase.createdAt)}</Text>
										</View>
										<View style={styles.purchaseRight}>
											<Text style={[styles.purchaseAmount, { color: colors.text }]}>{formatPrice(purchase.price)}</Text>
											<View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(purchase.status)}15` }]}>
												<Text style={[styles.statusText, { color: getStatusColor(purchase.status) }]}>
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
		container: {
			flex: 1
		},
		scrollContent: {
			paddingHorizontal: 16,
			paddingBottom: 28,
			paddingTop: 8
		},
		section: {
			marginBottom: 24
		},
		sectionHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: 16
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: '700',
			letterSpacing: -0.5
		},
		statsGrid: {
			flexDirection: 'row',
			flexWrap: 'wrap',
			gap: 12
		},
		statCard: {
			width: COLUMN_WIDTH,
			borderRadius: 20,
			padding: 16,
			borderWidth: 1,
			overflow: 'hidden',
			...Platform.select({
				ios: {
					shadowColor: '#000',
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.1,
					shadowRadius: 8
				},
				android: {
					elevation: 3
				}
			})
		},
		statGradient: {
			...StyleSheet.absoluteFillObject
		},
		statIcon: {
			width: 44,
			height: 44,
			borderRadius: 12,
			alignItems: 'center',
			justifyContent: 'center',
			marginBottom: 12
		},
		statBody: {
			gap: 2
		},
		statValue: {
			fontSize: 20,
			fontWeight: '700'
		},
		statLabel: {
			fontSize: 12,
			fontWeight: '500'
		},
		actionsRow: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center'
		},
		actionItem: {
			alignItems: 'center',
			width: (width - 32) / 4,
			gap: 8
		},
		actionButton: {
			width: 60,
			height: 60,
			borderRadius: 20,
			borderWidth: 1,
			justifyContent: 'center',
			alignItems: 'center',
			...Platform.select({
				ios: {
					shadowColor: '#000',
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.1,
					shadowRadius: 4
				},
				android: {
					elevation: 2
				}
			})
		},
		actionIconInner: {
			width: 48,
			height: 48,
			borderRadius: 16,
			justifyContent: 'center',
			alignItems: 'center'
		},
		actionButtonLabel: {
			fontSize: 12,
			fontWeight: '600'
		},
		panel: {
			borderRadius: 24,
			borderWidth: 1,
			padding: 8
		},
		purchaseRow: {
			flexDirection: 'row',
			alignItems: 'center',
			padding: 12,
			borderBottomWidth: 1,
			gap: 12
		},
		purchaseIcon: {
			width: 40,
			height: 40,
			borderRadius: 12,
			justifyContent: 'center',
			alignItems: 'center'
		},
		purchaseMeta: {
			flex: 1
		},
		purchaseTitle: {
			fontSize: 15,
			fontWeight: '600'
		},
		purchaseDate: {
			fontSize: 12,
			marginTop: 2
		},
		purchaseRight: {
			alignItems: 'flex-end'
		},
		purchaseAmount: {
			fontSize: 15,
			fontWeight: '700'
		},
		statusBadge: {
			marginTop: 4,
			paddingHorizontal: 8,
			paddingVertical: 2,
			borderRadius: 8
		},
		statusText: {
			fontSize: 10,
			fontWeight: '700',
			textTransform: 'uppercase'
		},
		headerIcon: {
			width: 40,
			height: 40,
			borderRadius: 12,
			justifyContent: 'center',
			alignItems: 'center'
		},
		iconButton: {
			padding: 4
		},
		emptyState: {
			alignItems: 'center',
			paddingVertical: 40,
			gap: 12
		},
		emptyIconContainer: {
			width: 80,
			height: 80,
			borderRadius: 40,
			justifyContent: 'center',
			alignItems: 'center',
			marginBottom: 8
		},
		emptyText: {
			fontSize: 16,
			fontWeight: '700'
		},
		emptySubtext: {
			fontSize: 14,
			textAlign: 'center',
			maxWidth: '80%',
			lineHeight: 20
		}
	})

export default Dashboard
