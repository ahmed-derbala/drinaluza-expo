import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'
import ScreenHeader from '../common/ScreenHeader'
import { getPurchases } from '../orders/orders.api'
import { OrderItem } from '../orders/orders.interface'
import { orderStatusEnum, orderStatusColors, orderStatusLabels } from '../../constants/orderStatus'
import { logError, parseError } from '../../utils/errorHandler'
import ErrorState from '../common/ErrorState'
import { useUser } from '../../contexts/UserContext'

type Order = OrderItem

type StatCardProps = {
	title: string
	value: string | number
	icon: React.ReactNode
	accent: string
	onPress?: () => void
	variant?: 'default' | 'hero'
}

type ActionCardProps = {
	label: string
	subtext: string
	icon: React.ReactNode
	onPress: () => void
}

const Dashboard = () => {
	const { colors } = useTheme()
	const styles = useMemo(() => createStyles(colors), [colors])
	const { localize, formatPrice, translate, currency } = useUser()
	const router = useRouter()

	const StatCard = ({ title, value, icon, accent, onPress, variant = 'default' }: StatCardProps) => {
		if (variant === 'hero') {
			return (
				<TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.heroCardContainer}>
					<LinearGradient colors={[colors.primary, accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
						<View style={styles.heroHeader}>
							<View style={styles.heroIcon}>{icon}</View>
							<Text style={styles.heroTitle}>{title}</Text>
						</View>
						<Text style={styles.heroValue}>{value}</Text>
						<View style={styles.heroFooter}>
							<Text style={styles.heroSubtitle}>+12.5% from last month</Text>
						</View>
					</LinearGradient>
				</TouchableOpacity>
			)
		}

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
				<View style={[styles.statIcon, { backgroundColor: `${accent}15` }]}>{icon}</View>
				<View style={styles.statBody}>
					<Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
					<Text style={[styles.statLabel, { color: colors.textSecondary }]}>{title}</Text>
				</View>
			</TouchableOpacity>
		)
	}

	const ActionCard = ({ label, subtext, icon, onPress }: ActionCardProps) => {
		return (
			<TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[styles.actionCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
				<View style={[styles.actionIcon, { backgroundColor: `${colors.primary}12` }]}>{icon}</View>
				<View>
					<Text style={[styles.actionLabel, { color: colors.text }]}>{label}</Text>
					<Text style={[styles.actionSubtext, { color: colors.textSecondary }]}>{subtext}</Text>
				</View>
			</TouchableOpacity>
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
	}, [])

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
				icon: <MaterialIcons name="payments" size={20} color={colors.primary} />,
				accent: colors.primary,
				onPress: () => router.push('/home/purchases' as any)
			},
			{
				title: translate('dashboard.purchases', 'Purchases'),
				value: stats.totalPurchases,
				icon: <MaterialIcons name="shopping-bag" size={20} color={colors.info} />,
				accent: colors.info,
				onPress: () => router.push('/home/purchases' as any)
			},
			{
				title: translate('dashboard.pending', 'Pending'),
				value: stats.pendingPurchases,
				icon: <MaterialIcons name="schedule" size={20} color={colors.warning} />,
				accent: colors.warning,
				onPress: () => router.push({ pathname: '/home/purchases', params: { filter: 'pending' } } as any)
			},
			{
				title: translate('dashboard.completed', 'Completed'),
				value: stats.completedPurchases,
				icon: <MaterialIcons name="check-circle" size={20} color={colors.success} />,
				accent: colors.success,
				onPress: () => router.push({ pathname: '/home/purchases', params: { filter: 'completed' } } as any)
			}
		],
		[colors.primary, colors.success, colors.warning, colors.info, router, stats, currency, formatPrice, translate]
	)

	const actions = useMemo(
		() => [
			{
				label: translate('dashboard.browse_shops', 'Browse shops'),
				subtext: translate('dashboard.discover_nearby', 'Discover stores nearby'),
				icon: <MaterialIcons name="storefront" size={22} color={colors.primary} />,
				onPress: () => router.push('/home/shops' as any)
			},
			{
				label: translate('dashboard.purchases', 'Purchases'),
				subtext: translate('dashboard.track_purchases', 'Track your purchases'),
				icon: <Feather name="package" size={22} color={colors.info} />,
				onPress: () => router.push('/home/purchases' as any)
			},
			{
				label: translate('dashboard.deals', 'Deals'),
				subtext: translate('dashboard.latest_offers', 'Latest offers'),
				icon: <Feather name="tag" size={22} color={colors.success} />,
				onPress: () => router.push('/home/feed' as any)
			}
		],
		[colors.info, colors.primary, colors.success, colors.warning, router, translate]
	)

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScreenHeader
				title={translate('dashboard', 'Dashboard')}
				subtitle={translate('dashboard.welcome', 'Welcome back')}
				showBack={false}
				rightActions={
					<TouchableOpacity onPress={onRefresh} accessibilityLabel="Refresh dashboard">
						<Ionicons name={refreshing ? 'hourglass-outline' : 'refresh-outline'} size={24} color={colors.text} />
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
						{/* Smaller Stats Row */}
						<View style={styles.statsRow}>
							{statCards.map((card) => (
								<StatCard key={card.title} {...card} />
							))}
						</View>
					</View>

					{/* Quick Actions */}
					<View style={styles.section}>
						<View style={styles.sectionHeader}>
							<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('dashboard.quick_actions', 'Quick Actions')}</Text>
						</View>
						<View style={styles.actionsGrid}>
							{actions.map((action) => (
								<ActionCard key={action.label} {...action} />
							))}
						</View>
					</View>

					{/* Recent Purchases */}
					<View style={styles.section}>
						<View style={styles.sectionHeader}>
							<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('dashboard.recent_purchases', 'Recent Purchases')}</Text>
							<TouchableOpacity onPress={() => router.push('/home/purchases' as any)}>
								<Text style={[styles.link, { color: colors.primary }]}>{translate('dashboard.view_all', 'View all')}</Text>
							</TouchableOpacity>
						</View>
						<View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
							{recentPurchases.length === 0 ? (
								<View style={styles.emptyState}>
									<Feather name="shopping-bag" size={32} color={colors.textSecondary} />
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
										<View style={styles.purchaseMeta}>
											<Text style={[styles.purchaseTitle, { color: colors.text }]}>{localize(purchase.shop.name)}</Text>
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
		heroCardContainer: {
			marginBottom: 16
		},
		heroCard: {
			padding: 24,
			borderRadius: 24
		},
		heroHeader: {
			flexDirection: 'row',
			alignItems: 'center',
			marginBottom: 8
		},
		heroIcon: {
			width: 40,
			height: 40,
			borderRadius: 12,
			backgroundColor: 'rgba(255,255,255,0.2)',
			justifyContent: 'center',
			alignItems: 'center',
			marginRight: 12
		},
		heroTitle: {
			fontSize: 16,
			fontWeight: '600',
			color: '#fff'
		},
		heroValue: {
			fontSize: 32,
			fontWeight: '700',
			color: '#fff',
			marginBottom: 8
		},
		heroFooter: {
			flexDirection: 'row',
			alignItems: 'center'
		},
		heroSubtitle: {
			fontSize: 14,
			color: 'rgba(255,255,255,0.8)'
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
			marginBottom: 12
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: '700'
		},
		statsRow: {
			flexDirection: 'row',
			gap: 12,
			marginBottom: 16
		},
		statCard: {
			flex: 1,
			borderRadius: 16,
			padding: 12,
			borderWidth: 1,
			alignItems: 'center',
			justifyContent: 'center',
			minHeight: 100,
			gap: 8,
			...Platform.select({
				ios: {
					shadowColor: '#000',
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.05,
					shadowRadius: 4
				},
				android: {
					elevation: 2
				}
			})
		},
		statIcon: {
			width: 36,
			height: 36,
			borderRadius: 10,
			alignItems: 'center',
			justifyContent: 'center',
			marginBottom: 4
		},
		statBody: {
			alignItems: 'center'
		},
		statLabel: {
			fontSize: 12,
			fontWeight: '500',
			textAlign: 'center'
		},
		statValue: {
			fontSize: 18,
			fontWeight: '700',
			marginBottom: 2
		},
		actionsGrid: {
			flexDirection: 'row',
			flexWrap: 'wrap',
			gap: 12
		},
		actionCard: {
			flexBasis: '48%',
			borderRadius: 16,
			padding: 16,
			borderWidth: 1,
			gap: 12
		},
		actionIcon: {
			width: 48,
			height: 48,
			borderRadius: 14,
			alignItems: 'center',
			justifyContent: 'center'
		},
		actionLabel: {
			fontSize: 15,
			fontWeight: '600',
			marginBottom: 2
		},
		actionSubtext: {
			fontSize: 12
		},
		panel: {
			borderRadius: 20,
			borderWidth: 1,
			paddingHorizontal: 16,
			paddingVertical: 8
		},
		purchaseRow: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			paddingVertical: 14,
			borderBottomWidth: 1
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
			marginTop: 4
		},
		purchaseRight: {
			alignItems: 'flex-end',
			minWidth: 110
		},
		purchaseAmount: {
			fontSize: 16,
			fontWeight: '700'
		},
		statusBadge: {
			marginTop: 6,
			paddingHorizontal: 10,
			paddingVertical: 4,
			borderRadius: 12,
			alignSelf: 'flex-start'
		},
		statusText: {
			fontSize: 11,
			fontWeight: '600',
			textTransform: 'capitalize'
		},
		link: {
			fontSize: 14,
			fontWeight: '600'
		},
		emptyState: {
			alignItems: 'center',
			paddingVertical: 32,
			gap: 8
		},
		emptyText: {
			fontSize: 16,
			fontWeight: '600'
		},
		emptySubtext: {
			fontSize: 13,
			textAlign: 'center',
			maxWidth: 200
		}
	})

export default Dashboard
