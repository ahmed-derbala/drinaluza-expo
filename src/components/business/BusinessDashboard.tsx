import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Alert, ActivityIndicator, useWindowDimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '../../contexts/ThemeContext'
import { LineChart } from 'react-native-chart-kit'
import { MaterialIcons, Ionicons, AntDesign } from '@expo/vector-icons'
import { getMyProducts } from '../products/products.api'
import { getMyShops } from '../shops/shops.api'
import ScreenHeader from '../common/ScreenHeader'

type StatCardProps = {
	title: string
	value: string | number
	icon: React.ReactNode
	accent: string
	trend?: 'up' | 'down'
	trendValue?: string
	onPress?: () => void
}

const StatCard = ({ title, value, icon, accent, trend, trendValue, onPress }: StatCardProps) => {
	const { colors } = useTheme()

	return (
		<TouchableOpacity
			activeOpacity={0.9}
			onPress={onPress}
			style={[
				styles.card,
				{
					backgroundColor: colors.card,
					borderColor: `${accent}40`
				}
			]}
		>
			<View style={[styles.cardIcon, { backgroundColor: `${accent}15` }]}>{icon}</View>
			<View style={styles.cardBody}>
				<Text style={[styles.cardTitle, { color: colors.textSecondary }]}>{title}</Text>
				<Text style={[styles.cardValue, { color: colors.text }]}>{value}</Text>
				{trend && trendValue && (
					<View style={styles.trendRow}>
						<AntDesign name={trend === 'up' ? 'arrowup' : 'arrowdown'} size={12} color={trend === 'up' ? colors.success : colors.error} style={{ marginRight: 4 }} />
						<Text style={[styles.trendText, { color: trend === 'up' ? colors.success : colors.error }]}>{trendValue}</Text>
					</View>
				)}
			</View>
		</TouchableOpacity>
	)
}

type ActionButtonProps = {
	label: string
	icon: React.ReactNode
	onPress: () => void
}

const ActionButton = ({ label, icon, onPress }: ActionButtonProps) => {
	const { colors } = useTheme()
	return (
		<TouchableOpacity onPress={onPress} style={[styles.actionCard, { borderColor: colors.border }]}>
			<View style={[styles.actionIcon, { backgroundColor: `${colors.primary}12` }]}>{icon}</View>
			<Text style={[styles.actionLabel, { color: colors.text }]}>{label}</Text>
		</TouchableOpacity>
	)
}

const BusinessDashboard = () => {
	const { colors } = useTheme()
	const router = useRouter()
	const { width } = useWindowDimensions()
	const isWide = width > 720
	const contentWidth = Math.min(width, 960)

	const [refreshing, setRefreshing] = useState(false)
	const [loading, setLoading] = useState(true)
	const [stats, setStats] = useState({
		totalRevenue: 12800,
		totalSalesCount: 86,
		totalProducts: 0,
		totalShops: 0,
		avgSaleValue: 68,
		saleCompletionRate: 92,
		salesData: {
			labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
			datasets: [
				{
					data: [8200, 9400, 7600, 11200, 12400, 13200],
					color: (opacity = 1) => `rgba(76, 110, 245, ${opacity})`,
					strokeWidth: 2
				}
			]
		},
		recentSales: [
			{ id: '1', customer: 'John Doe', amount: 120, status: 'completed', date: '2024-12-05' },
			{ id: '2', customer: 'Jane Smith', amount: 85, status: 'pending', date: '2024-12-04' },
			{ id: '3', customer: 'Bob Johnson', amount: 230, status: 'processing', date: '2024-12-03' },
			{ id: '4', customer: 'Alice Brown', amount: 65, status: 'completed', date: '2024-12-02' }
		]
	})

	const fetchDashboardData = useCallback(async () => {
		try {
			setLoading(true)
			const [productsResponse, shopsResponse] = await Promise.all([getMyProducts(), getMyShops()])
			setStats((prev) => ({
				...prev,
				totalProducts: productsResponse?.data?.pagination?.totalDocs || 0,
				totalShops: shopsResponse?.data?.pagination?.totalDocs || 0
			}))
		} catch (error) {
			console.error('Error fetching dashboard data:', error)
			Alert.alert('Error', 'Failed to load dashboard data. Please try again.')
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}, [])

	const onRefresh = useCallback(() => {
		setRefreshing(true)
		fetchDashboardData()
	}, [fetchDashboardData])

	useEffect(() => {
		fetchDashboardData()
	}, [fetchDashboardData])

	const formatCurrency = useCallback((amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount)
	}, [])

	const getStatusColor = useCallback(
		(status: string) => {
			switch (status.toLowerCase()) {
				case 'completed':
					return colors.success
				case 'processing':
					return colors.warning
				case 'pending':
					return colors.info
				case 'cancelled':
					return colors.error
				default:
					return colors.text
			}
		},
		[colors]
	)

	const sections = useMemo(
		() => ({
			overview: [
				{
					title: 'Revenue',
					value: formatCurrency(stats.totalRevenue),
					icon: <MaterialIcons name="attach-money" size={22} color={colors.primary} />,
					accent: colors.primary,
					trend: 'up' as const,
					trendValue: '+8% vs last month'
				},
				{
					title: 'Sales',
					value: stats.totalSalesCount,
					icon: <MaterialIcons name="shopping-cart" size={22} color={colors.info} />,
					accent: colors.info,
					trend: 'up' as const,
					trendValue: '+5% vs last week'
				},
				{
					title: 'Products',
					value: stats.totalProducts,
					icon: <MaterialIcons name="inventory" size={22} color={colors.success} />,
					accent: colors.success,
					onPress: () => router.push('/home/business/my-products' as any)
				},
				{
					title: 'Shops',
					value: stats.totalShops,
					icon: <MaterialIcons name="store" size={22} color={colors.warning} />,
					accent: colors.warning,
					onPress: () => router.push('/home/business/my-shops' as any)
				}
			],
			actions: [
				{
					label: 'Create product',
					icon: <MaterialIcons name="add-circle-outline" size={22} color={colors.primary} />,
					onPress: () => router.push('/home/business/my-products' as any)
				},
				{
					label: 'Create shop',
					icon: <MaterialIcons name="storefront" size={22} color={colors.success} />,
					onPress: () => router.push('/home/business/my-shops' as any)
				},
				{
					label: 'View sales',
					icon: <MaterialIcons name="receipt-long" size={22} color={colors.info} />,
					onPress: () => router.push('/home/business/sales' as any)
				},
				{
					label: 'Sales analytics',
					icon: <MaterialIcons name="insights" size={22} color={colors.warning} />,
					onPress: () => router.push('/home/business/sales' as any)
				}
			]
		}),
		[colors.info, colors.primary, colors.success, colors.warning, formatCurrency, router, stats.totalProducts, stats.totalRevenue, stats.totalSalesCount, stats.totalShops]
	)

	if (loading) {
		return (
			<View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScreenHeader
				title="Business"
				subtitle="Stay on top of sales and operations"
				showBack={false}
				rightActions={
					<TouchableOpacity onPress={() => router.push('/home/settings' as any)} accessibilityLabel="Notifications and settings">
						<Ionicons name="notifications-outline" size={22} color={colors.text} />
					</TouchableOpacity>
				}
			/>

			<ScrollView
				contentContainerStyle={[styles.scrollContainer, { width: contentWidth }]}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
				showsVerticalScrollIndicator={false}
			>
				<View style={[styles.section, isWide && styles.sectionRow]}>
					{sections.overview.map((item) => (
						<View key={item.title} style={[styles.cardWrapper, isWide && { flex: 1 }]}>
							<StatCard {...item} />
						</View>
					))}
				</View>

				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={[styles.sectionTitle, { color: colors.text }]}>Sales overview</Text>
						<Text style={[styles.sectionHint, { color: colors.textSecondary }]}>Last 6 months</Text>
					</View>
					<View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<LineChart
							data={stats.salesData}
							width={contentWidth - 48}
							height={220}
							yAxisLabel="$"
							withVerticalLines={false}
							chartConfig={{
								backgroundColor: colors.card,
								backgroundGradientFrom: colors.card,
								backgroundGradientTo: colors.card,
								decimalPlaces: 0,
								color: (opacity = 1) => `rgba(76,110,245,${opacity})`,
								labelColor: (opacity = 1) => `rgba(100,110,130,${opacity})`,
								propsForDots: {
									r: '4',
									strokeWidth: '2',
									stroke: colors.primary
								}
							}}
							bezier
							style={styles.chart}
						/>
						<View style={styles.chartFooter}>
							<Text style={[styles.sectionHint, { color: colors.textSecondary }]}>Avg. sale value</Text>
							<Text style={[styles.chartStat, { color: colors.text }]}>{formatCurrency(stats.avgSaleValue)}</Text>
							<Text style={[styles.sectionHint, { color: colors.textSecondary }]}>Completion rate {stats.saleCompletionRate}%</Text>
						</View>
					</View>
				</View>

				<View style={styles.section}>
					<Text style={[styles.sectionTitle, { color: colors.text }]}>Quick actions</Text>
					<View style={[styles.actionsGrid, isWide && styles.actionsGridWide]}>
						{sections.actions.map((action) => (
							<ActionButton key={action.label} {...action} />
						))}
					</View>
				</View>

				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={[styles.sectionTitle, { color: colors.text }]}>Recent sales</Text>
						<TouchableOpacity onPress={() => router.push('/home/business/sales' as any)}>
							<Text style={[styles.link, { color: colors.primary }]}>View all</Text>
						</TouchableOpacity>
					</View>
					<View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
						{stats.recentSales.map((sale) => (
							<TouchableOpacity key={sale.id} onPress={() => router.push('/home/business/sales' as any)} style={[styles.saleRow, { borderColor: colors.border }]}>
								<View style={styles.saleMeta}>
									<Text style={[styles.saleCustomer, { color: colors.text }]}>{sale.customer}</Text>
									<Text style={[styles.saleDate, { color: colors.textSecondary }]}>{new Date(sale.date).toLocaleDateString()}</Text>
								</View>
								<View style={styles.saleStats}>
									<Text style={[styles.saleAmount, { color: colors.text }]}>{formatCurrency(sale.amount)}</Text>
									<View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(sale.status)}15` }]}>
										<Text style={[styles.statusText, { color: getStatusColor(sale.status) }]}>{sale.status}</Text>
									</View>
								</View>
							</TouchableOpacity>
						))}
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
	scrollContainer: {
		paddingHorizontal: 16,
		paddingBottom: 32,
		alignSelf: 'center'
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	section: {
		marginBottom: 20
	},
	sectionRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12
	},
	cardWrapper: {
		marginBottom: 12
	},
	card: {
		borderRadius: 14,
		padding: 14,
		borderWidth: 1,
		gap: 10,
		minWidth: 150,
		flexDirection: 'row',
		alignItems: 'center'
	},
	cardIcon: {
		width: 44,
		height: 44,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center'
	},
	cardBody: {
		flex: 1
	},
	cardTitle: {
		fontSize: 13,
		fontWeight: '500'
	},
	cardValue: {
		fontSize: 20,
		fontWeight: '700'
	},
	trendRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 4
	},
	trendText: {
		fontSize: 12,
		fontWeight: '600'
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700'
	},
	sectionHint: {
		fontSize: 13,
		fontWeight: '500'
	},
	panel: {
		borderRadius: 14,
		borderWidth: 1,
		padding: 14
	},
	chart: {
		marginTop: 4,
		borderRadius: 12
	},
	chartFooter: {
		marginTop: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	chartStat: {
		fontSize: 16,
		fontWeight: '700'
	},
	actionsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12
	},
	actionsGridWide: {
		justifyContent: 'flex-start'
	},
	actionCard: {
		borderRadius: 12,
		padding: 14,
		minWidth: 150,
		flex: 1,
		borderWidth: 1,
		alignItems: 'flex-start'
	},
	actionIcon: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 8
	},
	actionLabel: {
		fontSize: 15,
		fontWeight: '600'
	},
	link: {
		fontSize: 14,
		fontWeight: '600'
	},
	saleRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1
	},
	saleMeta: {
		flex: 1
	},
	saleStats: {
		alignItems: 'flex-end',
		minWidth: 120
	},
	saleCustomer: {
		fontSize: 15,
		fontWeight: '600'
	},
	saleDate: {
		fontSize: 12,
		marginTop: 2
	},
	saleAmount: {
		fontSize: 16,
		fontWeight: '700'
	},
	statusBadge: {
		marginTop: 6,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 10,
		alignSelf: 'flex-start'
	},
	statusText: {
		fontSize: 12,
		fontWeight: '600',
		textTransform: 'capitalize'
	}
})

export default BusinessDashboard
