import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions, RefreshControl } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { MaterialIcons, MaterialCommunityIcons, FontAwesome5, AntDesign, Ionicons } from '@expo/vector-icons'
import { getMyProducts } from '../products/products.api'
import { getMyShops } from '../shops/shops.api'
import { useNavigation } from '@react-navigation/native'
import { LineChart } from 'react-native-chart-kit'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

type DashboardCardProps = {
	title: string
	value: string | number
	icon: React.ReactNode
	color: string
	onPress?: () => void
	trend?: 'up' | 'down' | 'neutral'
	trendValue?: string
}

const DashboardCard = ({ title, value, icon, color, onPress, trend, trendValue }: DashboardCardProps) => {
	const { colors } = useTheme()

	const getTrendIcon = () => {
		if (trend === 'up') {
			return <AntDesign name="arrowup" size={14} color="#4CAF50" style={styles.trendIcon} />
		} else if (trend === 'down') {
			return <AntDesign name="arrowdown" size={14} color="#F44336" style={styles.trendIcon} />
		}
		return null
	}

	return (
		<TouchableOpacity style={[styles.card, { backgroundColor: color }]} onPress={onPress} activeOpacity={0.9}>
			<View style={styles.cardIconContainer}>
				<View style={[styles.cardIcon, { backgroundColor: `${color}30` }]}>{icon}</View>
			</View>
			<View style={styles.cardContent}>
				<Text style={styles.cardValue}>{value}</Text>
				<Text style={styles.cardTitle}>{title}</Text>

				{trend && trendValue && (
					<View style={styles.trendContainer}>
						{getTrendIcon()}
						<Text
							style={[
								styles.trendText,
								{
									color: trend === 'up' ? '#4CAF50' : trend === 'down' ? '#F44336' : colors.text
								}
							]}
						>
							{trendValue} {trend === 'up' ? 'Increase' : trend === 'down' ? 'Decrease' : ''}
						</Text>
					</View>
				)}
			</View>
		</TouchableOpacity>
	)
}

// Mock data for the chart
const chartData = {
	labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
	datasets: [
		{
			data: [2000, 4500, 2800, 8000, 9900, 12000],
			color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
			strokeWidth: 2
		}
	],
	legend: ['Monthly Sales']
}

// Mock recent orders
const recentOrders = [
	{ id: '1', customer: 'John Doe', amount: 120, status: 'completed', date: '2023-06-15' },
	{ id: '2', customer: 'Jane Smith', amount: 85, status: 'processing', date: '2023-06-14' },
	{ id: '3', customer: 'Mike Johnson', amount: 220, status: 'shipped', date: '2023-06-13' },
	{ id: '4', customer: 'Sarah Williams', amount: 150, status: 'completed', date: '2023-06-12' }
]

const chartConfig = {
	backgroundColor: '#ffffff',
	backgroundGradientFrom: '#ffffff',
	backgroundGradientTo: '#ffffff',
	decimalPlaces: 0,
	color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
	labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
	style: {
		borderRadius: 16
	},
	propsForDots: {
		r: '4',
		strokeWidth: '2',
		stroke: '#2196F3'
	}
}

export default function BusinessDashboard() {
	const { colors } = useTheme()
	const navigation = useNavigation()
	const [refreshing, setRefreshing] = useState(false)
	const [loading, setLoading] = useState(true)
	const [stats, setStats] = useState({
		totalProducts: 0,
		activeProducts: 0,
		totalShops: 0,
		totalSales: 12560,
		monthlyGrowth: 12.5,
		conversionRate: 3.2,
		avgOrderValue: 89.5
	})

	const fetchDashboardData = async () => {
		try {
			setRefreshing(true)

			// Fetch products
			const productsResponse = await getMyProducts(1, 100)
			const products = productsResponse.data.data || []
			const activeProducts = products.filter((p) => p.isActive).length

			// Fetch shops
			const shopsResponse = await getMyShops(1, 100)
			const shops = shopsResponse.data.data || []

			// In a real app, you would fetch these values from your API
			setStats((prevStats) => ({
				...prevStats,
				totalProducts: products.length,
				activeProducts,
				totalShops: shops.length
			}))
		} catch (error) {
			console.error('Failed to load dashboard data:', error)
			Alert.alert('Error', 'Failed to load dashboard data')
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}

	const onRefresh = () => {
		fetchDashboardData()
	}

	useEffect(() => {
		fetchDashboardData()
	}, [])

	if (loading) {
		return (
			<View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
				<ActivityIndicator size="large" color={colors.primary} />
				<Text style={[styles.loadingText, { color: colors.text }]}>Loading dashboard...</Text>
			</View>
		)
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(amount)
	}

	const getStatusColor = (status: string) => {
		switch (status.toLowerCase()) {
			case 'completed':
				return '#4CAF50'
			case 'processing':
				return '#FFC107'
			case 'shipped':
				return '#2196F3'
			default:
				return '#9E9E9E'
		}
	}

	return (
		<ScrollView
			style={[styles.container, { backgroundColor: colors.background }]}
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
		>
			<View style={styles.header}>
				<View style={styles.headerTopRow}>
					<View>
						<Text style={[styles.headerGreeting, { color: colors.textSecondary }]}>Welcome back!</Text>
						<Text style={[styles.headerTitle, { color: colors.text }]}>Business Dashboard</Text>
					</View>
					<TouchableOpacity style={[styles.notificationButton, { backgroundColor: colors.card }]}>
						<Ionicons name="notifications-outline" size={24} color={colors.text} />
						<View style={[styles.notificationBadge, { backgroundColor: colors.primary }]} />
					</TouchableOpacity>
				</View>
				<Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Here's what's happening with your business today</Text>
			</View>

			{/* Stats Overview */}
			<View style={styles.overviewContainer}>
				<View style={styles.overviewCard}>
					<View style={[styles.overviewIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
						<MaterialIcons name="trending-up" size={24} color="#4CAF50" />
					</View>
					<View style={styles.overviewTextContainer}>
						<Text style={[styles.overviewValue, { color: colors.text }]}>{formatCurrency(stats.totalSales)}</Text>
						<Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>Total Revenue</Text>
					</View>
					<View style={styles.overviewTrend}>
						<AntDesign name="arrowup" size={14} color="#4CAF50" />
						<Text style={[styles.overviewTrendText, { color: '#4CAF50' }]}>{stats.monthlyGrowth}%</Text>
					</View>
				</View>
			</View>

			{/* Stats Grid */}
			<View style={styles.statsGrid}>
				<DashboardCard
					title="Total Products"
					value={stats.totalProducts}
					icon={<MaterialIcons name="inventory" size={20} color="#fff" />}
					color="#4CAF50"
					trend="up"
					trendValue="5.2%"
					onPress={() => navigation.navigate('my-products')}
				/>
				<DashboardCard
					title="Active Products"
					value={stats.activeProducts}
					icon={<MaterialIcons name="check-circle" size={20} color="#fff" />}
					color="#2196F3"
					trend="up"
					trendValue="2.1%"
					onPress={() => navigation.navigate('my-products')}
				/>
				<DashboardCard
					title="Total Shops"
					value={stats.totalShops}
					icon={<MaterialIcons name="store" size={20} color="#fff" />}
					color="#9C27B0"
					trend="up"
					trendValue="8.7%"
					onPress={() => navigation.navigate('my-shops')}
				/>
				<DashboardCard
					title="Conversion"
					value={`${stats.conversionRate}%`}
					icon={<MaterialIcons name="trending-up" size={20} color="#fff" />}
					color="#FF9800"
					trend="up"
					trendValue="1.2%"
					onPress={() => {}}
				/>
			</View>

			{/* Sales Chart */}
			<View style={[styles.chartContainer, { backgroundColor: colors.card }]}>
				<View style={styles.chartHeader}>
					<Text style={[styles.sectionTitle, { color: colors.text }]}>Sales Overview</Text>
					<TouchableOpacity>
						<Text style={[styles.viewAllText, { color: colors.primary }]}>View Report</Text>
					</TouchableOpacity>
				</View>
				<LineChart
					data={chartData}
					width={SCREEN_WIDTH - 48}
					height={220}
					chartConfig={chartConfig}
					bezier
					style={styles.chart}
					withDots={false}
					withShadow={false}
					withInnerLines={false}
					withOuterLines={false}
					withVerticalLines={false}
					withHorizontalLines={true}
					withVerticalLabels={true}
					withHorizontalLabels={true}
					fromZero={true}
					segments={5}
				/>
			</View>

			{/* Recent Orders */}
			<View style={styles.recentOrders}>
				<View style={styles.sectionHeader}>
					<Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Orders</Text>
					<TouchableOpacity onPress={() => navigation.navigate('orders')}>
						<Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
					</TouchableOpacity>
				</View>

				{recentOrders.map((order) => (
					<TouchableOpacity key={order.id} style={[styles.orderCard, { backgroundColor: colors.card }]} onPress={() => navigation.navigate('order-details', { orderId: order.id })}>
						<View style={styles.orderInfo}>
							<Text style={[styles.orderCustomer, { color: colors.text }]}>{order.customer}</Text>
							<Text style={[styles.orderDate, { color: colors.textSecondary }]}>{new Date(order.date).toLocaleDateString()}</Text>
						</View>
						<View style={styles.orderDetails}>
							<Text style={[styles.orderAmount, { color: colors.text }]}>{formatCurrency(order.amount)}</Text>
							<View style={[styles.orderStatus, { backgroundColor: `${getStatusColor(order.status)}20` }]}>
								<Text style={[styles.orderStatusText, { color: getStatusColor(order.status) }]}>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</Text>
							</View>
						</View>
					</TouchableOpacity>
				))}
			</View>

			{/* Quick Actions */}
			<View style={styles.quickActions}>
				<Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
				<View style={styles.actionButtons}>
					<TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.card }]} onPress={() => navigation.navigate('my-products', { screen: 'add-product' })}>
						<View style={[styles.actionIcon, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}>
							<MaterialIcons name="add-circle-outline" size={24} color="#2196F3" />
						</View>
						<Text style={[styles.actionButtonText, { color: colors.text }]}>Add Product</Text>
					</TouchableOpacity>

					<TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.card }]} onPress={() => navigation.navigate('my-shops', { screen: 'add-shop' })}>
						<View style={[styles.actionIcon, { backgroundColor: 'rgba(156, 39, 176, 0.1)' }]}>
							<MaterialIcons name="add-business" size={24} color="#9C27B0" />
						</View>
						<Text style={[styles.actionButtonText, { color: colors.text }]}>Add Shop</Text>
					</TouchableOpacity>

					<TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.card }]} onPress={() => navigation.navigate('analytics')}>
						<View style={[styles.actionIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
							<MaterialIcons name="analytics" size={24} color="#4CAF50" />
						</View>
						<Text style={[styles.actionButtonText, { color: colors.text }]}>Analytics</Text>
					</TouchableOpacity>

					<TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.card }]} onPress={() => navigation.navigate('promotions')}>
						<View style={[styles.actionIcon, { backgroundColor: 'rgba(255, 152, 0, 0.1)' }]}>
							<MaterialIcons name="local-offer" size={24} color="#FF9800" />
						</View>
						<Text style={[styles.actionButtonText, { color: colors.text }]}>Promotions</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Performance Metrics */}
			<View style={[styles.metricsContainer, { backgroundColor: colors.card }]}>
				<Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>Performance Metrics</Text>
				<View style={styles.metricsGrid}>
					<View style={styles.metricItem}>
						<Text style={[styles.metricValue, { color: colors.primary }]}>{stats.avgOrderValue.toFixed(2)}</Text>
						<Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Avg. Order Value</Text>
					</View>
					<View style={styles.metricDivider} />
					<View style={styles.metricItem}>
						<Text style={[styles.metricValue, { color: colors.primary }]}>24h</Text>
						<Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Avg. Delivery Time</Text>
					</View>
					<View style={styles.metricDivider} />
					<View style={styles.metricItem}>
						<Text style={[styles.metricValue, { color: colors.primary }]}>92%</Text>
						<Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Success Rate</Text>
					</View>
				</View>
			</View>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	loadingText: {
		marginTop: 10,
		fontSize: 16
	},
	header: {
		marginBottom: 24
	},
	headerTopRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8
	},
	headerGreeting: {
		fontSize: 14,
		marginBottom: 4
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 4
	},
	headerSubtitle: {
		fontSize: 14,
		color: '#666'
	},
	notificationButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: 'center',
		alignItems: 'center',
		position: 'relative'
	},
	notificationBadge: {
		position: 'absolute',
		top: 8,
		right: 8,
		width: 8,
		height: 8,
		borderRadius: 4
	},
	overviewContainer: {
		marginBottom: 20
	},
	overviewCard: {
		flexDirection: 'row',
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 20,
		alignItems: 'center',
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4
	},
	overviewIcon: {
		width: 48,
		height: 48,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 16
	},
	overviewTextContainer: {
		flex: 1
	},
	overviewValue: {
		fontSize: 22,
		fontWeight: 'bold',
		marginBottom: 4
	},
	overviewLabel: {
		fontSize: 14,
		color: '#666'
	},
	overviewTrend: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(76, 175, 80, 0.1)',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12
	},
	overviewTrendText: {
		marginLeft: 4,
		fontSize: 12,
		fontWeight: '600'
	},
	statsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginHorizontal: -6,
		marginBottom: 20
	},
	card: {
		width: '48%',
		borderRadius: 16,
		padding: 16,
		margin: 4,
		flexDirection: 'row',
		alignItems: 'center',
		elevation: 1,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		marginBottom: 12
	},
	cardIconContainer: {
		marginRight: 12
	},
	cardIcon: {
		width: 40,
		height: 40,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(255, 255, 255, 0.2)'
	},
	cardContent: {
		flex: 1
	},
	cardValue: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#fff',
		marginBottom: 2
	},
	cardTitle: {
		fontSize: 12,
		color: 'rgba(255, 255, 255, 0.8)',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: 2
	},
	trendContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 2
	},
	trendIcon: {
		marginRight: 2
	},
	trendText: {
		fontSize: 10,
		fontWeight: '600'
	},
	chartContainer: {
		borderRadius: 16,
		padding: 16,
		marginBottom: 20,
		elevation: 1,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2
	},
	chartHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16
	},
	chart: {
		marginVertical: 8,
		borderRadius: 16
	},
	recentOrders: {
		marginBottom: 20
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16
	},
	viewAllText: {
		fontSize: 14,
		fontWeight: '500'
	},
	orderCard: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		borderRadius: 12,
		marginBottom: 12,
		elevation: 1,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2
	},
	orderInfo: {
		flex: 1
	},
	orderCustomer: {
		fontSize: 15,
		fontWeight: '600',
		marginBottom: 4
	},
	orderDate: {
		fontSize: 12
	},
	orderDetails: {
		alignItems: 'flex-end'
	},
	orderAmount: {
		fontSize: 15,
		fontWeight: '600',
		marginBottom: 4
	},
	orderStatus: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12
	},
	orderStatusText: {
		fontSize: 11,
		fontWeight: '600'
	},
	quickActions: {
		marginBottom: 20
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 16
	},
	actionButtons: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginHorizontal: -6
	},
	actionButton: {
		width: '47%',
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		borderRadius: 12,
		margin: 4,
		marginBottom: 12,
		elevation: 1,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2
	},
	actionIcon: {
		width: 36,
		height: 36,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12
	},
	actionButtonText: {
		fontSize: 14,
		fontWeight: '500'
	},
	metricsContainer: {
		borderRadius: 16,
		padding: 20,
		marginBottom: 20,
		elevation: 1,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2
	},
	metricsGrid: {
		flexDirection: 'row',
		justifyContent: 'space-between'
	},
	metricItem: {
		alignItems: 'center',
		flex: 1
	},
	metricValue: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 4
	},
	metricLabel: {
		fontSize: 12,
		textAlign: 'center'
	}
})
