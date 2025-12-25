import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'
import ScreenHeader from '../common/ScreenHeader'
import { LinearGradient } from 'expo-linear-gradient'
import { LineChart } from 'react-native-chart-kit'

const { width } = Dimensions.get('window')

type Order = {
	id: string
	shopName: string
	amount: number
	status: 'pending' | 'completed' | 'cancelled' | 'processing'
	date: string
}

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

const StatCard = ({ title, value, icon, accent, onPress, variant = 'default' }: StatCardProps) => {
	const { colors } = useTheme()

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
	const { colors } = useTheme()
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

const Dashboard = () => {
	const { colors, isDark } = useTheme()
	const router = useRouter()
	const [refreshing, setRefreshing] = useState(false)
	const [loading, setLoading] = useState(true)
	const [stats, setStats] = useState({
		totalPurchases: 0,
		pendingPurchases: 0,
		completedPurchases: 0,
		totalSpent: 0
	})
	const [recentPurchases, setRecentPurchases] = useState<Order[]>([])
	const [chartData, setChartData] = useState<number[]>([0, 0, 0, 0, 0, 0])

	const loadDashboard = useCallback(async () => {
		try {
			setLoading(true)
			// Placeholder data; replace with API calls when ready
			setStats({
				totalPurchases: 47,
				pendingPurchases: 5,
				completedPurchases: 38,
				totalSpent: 4892.75
			})
			setRecentPurchases([
				{ id: '1', shopName: 'Fresh Market', amount: 125.5, status: 'completed', date: '2 hours ago' },
				{ id: '2', shopName: 'Tech Store', amount: 450, status: 'processing', date: '1 day ago' },
				{ id: '3', shopName: 'Fashion Boutique', amount: 89.99, status: 'completed', date: '3 days ago' },
				{ id: '4', shopName: 'Home Essentials', amount: 234.5, status: 'pending', date: '5 days ago' }
			])
			// Mock chart data
			setChartData([500, 1200, 900, 1500, 2000, 4892])
		} catch (error) {
			console.error('Failed to load customer dashboard', error)
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
		(status: Order['status']) => {
			switch (status) {
				case 'completed':
					return colors.success
				case 'processing':
					return colors.info
				case 'pending':
					return colors.warning
				case 'cancelled':
					return colors.error
				default:
					return colors.textSecondary
			}
		},
		[colors]
	)

	const statCards = useMemo(
		() => [
			{
				title: 'Purchases',
				value: stats.totalPurchases,
				icon: <MaterialIcons name="shopping-bag" size={20} color={colors.primary} />,
				accent: colors.primary,
				onPress: () => router.push('/home/purchases' as any)
			},
			{
				title: 'Pending',
				value: stats.pendingPurchases,
				icon: <MaterialIcons name="schedule" size={20} color={colors.warning} />,
				accent: colors.warning,
				onPress: () => router.push({ pathname: '/home/purchases', params: { filter: 'pending' } } as any)
			},
			{
				title: 'Completed',
				value: stats.completedPurchases,
				icon: <MaterialIcons name="check-circle" size={20} color={colors.success} />,
				accent: colors.success,
				onPress: () => router.push({ pathname: '/home/purchases', params: { filter: 'completed' } } as any)
			}
		],
		[colors.primary, colors.success, colors.warning, router, stats.completedPurchases, stats.pendingPurchases, stats.totalPurchases]
	)

	const actions = useMemo(
		() => [
			{
				label: 'Browse shops',
				subtext: 'Discover stores nearby',
				icon: <MaterialIcons name="storefront" size={22} color={colors.primary} />,
				onPress: () => router.push('/home/shops' as any)
			},
			{
				label: 'Purchases',
				subtext: 'Track your purchases',
				icon: <Feather name="package" size={22} color={colors.info} />,
				onPress: () => router.push('/home/purchases' as any)
			},
			{
				label: 'Deals',
				subtext: 'Latest offers',
				icon: <Feather name="tag" size={22} color={colors.success} />,
				onPress: () => router.push('/home/feed' as any)
			},
			{
				label: 'Profile',
				subtext: 'Manage account',
				icon: <Feather name="user" size={22} color={colors.warning} />,
				onPress: () => router.push('/home/profile' as any)
			}
		],
		[colors.info, colors.primary, colors.success, colors.warning, router]
	)

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScreenHeader
				title="Overview"
				subtitle="Welcome back"
				showBack={false}
				rightActions={
					<TouchableOpacity onPress={onRefresh} accessibilityLabel="Refresh dashboard">
						<Ionicons name={refreshing ? 'refresh' : 'notifications-outline'} size={24} color={colors.text} />
					</TouchableOpacity>
				}
			/>

			<ScrollView
				contentContainerStyle={styles.scrollContent}
				refreshControl={<RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
				showsVerticalScrollIndicator={false}
			>
				{/* Overview Section */}
				<View style={styles.section}>
					{/* Hero Card for Total Spent */}
					<StatCard
						title="Total Spent"
						value={`${Math.round(stats.totalSpent)} TND`}
						icon={<MaterialIcons name="account-balance-wallet" size={24} color="#fff" />}
						accent={colors.primary}
						variant="hero"
					/>

					{/* Smaller Stats Row */}
					<View style={styles.statsRow}>
						{statCards.map((card) => (
							<StatCard key={card.title} {...card} />
						))}
					</View>

					{/* Spending Chart */}
					<View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<View style={styles.chartHeader}>
							<Text style={[styles.chartTitle, { color: colors.text }]}>Spending Trend</Text>
							<Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Last 6 months</Text>
						</View>
						<LineChart
							data={{
								labels: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
								datasets: [
									{
										data: chartData
									}
								]
							}}
							width={width - 64} // container padding + card padding
							height={180}
							yAxisLabel=""
							yAxisSuffix=""
							yAxisInterval={1}
							chartConfig={{
								backgroundColor: colors.card,
								backgroundGradientFrom: colors.card,
								backgroundGradientTo: colors.card,
								decimalPlaces: 0,
								color: (opacity = 1) => colors.primary,
								labelColor: (opacity = 1) => colors.textSecondary,
								style: {
									borderRadius: 16
								},
								propsForDots: {
									r: '4',
									strokeWidth: '2',
									stroke: colors.primary
								},
								propsForBackgroundLines: {
									strokeDasharray: '', // solid lines
									stroke: colors.border,
									strokeOpacity: 0.2
								}
							}}
							bezier
							style={styles.chart}
							withDots={true}
							withInnerLines={true}
							withOuterLines={false}
							withVerticalLines={false}
						/>
					</View>
				</View>

				{/* Quick Actions */}
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
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
						<Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Purchases</Text>
						<TouchableOpacity onPress={() => router.push('/home/purchases' as any)}>
							<Text style={[styles.link, { color: colors.primary }]}>View all</Text>
						</TouchableOpacity>
					</View>
					<View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
						{recentPurchases.length === 0 ? (
							<View style={styles.emptyState}>
								<Feather name="shopping-bag" size={32} color={colors.textSecondary} />
								<Text style={[styles.emptyText, { color: colors.textSecondary }]}>No purchases yet</Text>
								<Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>Browse shops to place your first purchase</Text>
							</View>
						) : (
							recentPurchases.map((purchase, index) => (
								<TouchableOpacity
									key={purchase.id}
									style={[styles.purchaseRow, { borderColor: colors.border }, index === recentPurchases.length - 1 && { borderBottomWidth: 0 }]}
									onPress={() => router.push('/home/purchases' as any)}
									activeOpacity={0.8}
								>
									<View style={styles.purchaseMeta}>
										<Text style={[styles.purchaseTitle, { color: colors.text }]}>{purchase.shopName}</Text>
										<Text style={[styles.purchaseDate, { color: colors.textSecondary }]}>{purchase.date}</Text>
									</View>
									<View style={styles.purchaseRight}>
										<Text style={[styles.purchaseAmount, { color: colors.text }]}>{purchase.amount.toFixed(2)} TND</Text>
										<View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(purchase.status)}15` }]}>
											<Text style={[styles.statusText, { color: getStatusColor(purchase.status) }]}>{purchase.status}</Text>
										</View>
									</View>
								</TouchableOpacity>
							))
						)}
					</View>
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
	heroCardContainer: {
		marginBottom: 16,
		borderRadius: 20,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.15,
				shadowRadius: 12
			},
			android: {
				elevation: 6
			}
		})
	},
	heroCard: {
		padding: 20,
		borderRadius: 20,
		minHeight: 140,
		justifyContent: 'space-between'
	},
	heroHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 8
	},
	heroIcon: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: 'rgba(255,255,255,0.2)',
		alignItems: 'center',
		justifyContent: 'center'
	},
	heroTitle: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
		opacity: 0.9
	},
	heroValue: {
		color: '#fff',
		fontSize: 32,
		fontWeight: '800',
		marginVertical: 4
	},
	heroFooter: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	heroSubtitle: {
		color: '#fff',
		fontSize: 13,
		fontWeight: '500',
		opacity: 0.8
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
	chartCard: {
		borderRadius: 20,
		borderWidth: 1,
		padding: 16,
		overflow: 'hidden'
	},
	chartHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16
	},
	chartTitle: {
		fontSize: 16,
		fontWeight: '600'
	},
	chartSubtitle: {
		fontSize: 12
	},
	chart: {
		marginVertical: 8,
		borderRadius: 16
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
