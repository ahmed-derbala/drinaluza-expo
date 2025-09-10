import React, { useState, useCallback, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Dimensions, Alert, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '../../contexts/ThemeContext'
import { LineChart } from 'react-native-chart-kit'
import { MaterialIcons, Ionicons, AntDesign } from '@expo/vector-icons'
import { getMyProducts } from '../products/products.api'
import { getMyShops } from '../shops/shops.api'

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
	const styles = createStyles(colors, false)

	const getTrendIcon = () => {
		if (trend === 'up') {
			return <AntDesign name="arrowup" size={14} color={colors.success} style={styles.trendIcon} />
		} else if (trend === 'down') {
			return <AntDesign name="arrowdown" size={14} color={colors.error} style={styles.trendIcon} />
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
						<Text style={[styles.trendText, { color: trend === 'up' ? colors.success : colors.error }]}>{trendValue}</Text>
					</View>
				)}
			</View>
		</TouchableOpacity>
	)
}

const BusinessDashboard = () => {
	const { colors, isDark } = useTheme()
	const styles = createStyles(colors, isDark)
	const router = useRouter()

	// Helper function to navigate with type safety and debug logging
	const navigateTo = (path: string) => {
		console.log('Attempting to navigate to:', path)
		try {
			// @ts-ignore - Workaround for Expo Router type issues
			router.push(path)
			console.log('Navigation successful')
		} catch (error) {
			console.error('Navigation error:', error)
		}
	}
	const [refreshing, setRefreshing] = useState(false)
	const [loading, setLoading] = useState(true)
	const [stats, setStats] = useState({
		totalSales: 0,
		totalOrders: 0,
		totalProducts: 0,
		totalShops: 0,
		avgOrderValue: 0,
		orderCompletionRate: 0,
		salesData: {
			labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
			datasets: [
				{
					data: [2000, 4500, 2800, 8000, 9900, 4300],
					color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
					strokeWidth: 2
				}
			]
		},
		recentOrders: [
			{ id: '1', customer: 'John Doe', amount: 120, status: 'completed', date: '2023-05-15' },
			{ id: '2', customer: 'Jane Smith', amount: 85, status: 'pending', date: '2023-05-14' },
			{ id: '3', customer: 'Bob Johnson', amount: 230, status: 'processing', date: '2023-05-13' },
			{ id: '4', customer: 'Alice Brown', amount: 65, status: 'completed', date: '2023-05-12' },
			{ id: '5', customer: 'Charlie Wilson', amount: 175, status: 'cancelled', date: '2023-05-11' }
		]
	})

	const fetchDashboardData = useCallback(async () => {
		try {
			setLoading(true)

			// Fetch products and shops data
			const [productsResponse, shopsResponse] = await Promise.all([getMyProducts(), getMyShops()])

			// Update stats with fetched data
			setStats((prev) => ({
				...prev,
				totalProducts: productsResponse?.data?.length || 0,
				totalShops: shopsResponse?.data?.length || 0
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

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount)
	}

	const getStatusColor = (status: string) => {
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
	}

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.scrollContainer}
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
		>
			<View style={styles.header}>
				<Text style={[styles.headerTitle, { color: colors.text }]}>Business Dashboard</Text>
				<TouchableOpacity>
					<Ionicons name="notifications-outline" size={24} color={colors.text} />
				</TouchableOpacity>
			</View>

			<View style={styles.statsRow}>
				<DashboardCard
					title="Total Sales"
					value={formatCurrency(stats.totalSales)}
					icon={<MaterialIcons name="attach-money" size={24} color="#fff" />}
					color={colors.primary}
					trend="up"
					trendValue="12% from last month"
				/>
				<DashboardCard
					title="Total Orders"
					value={stats.totalOrders}
					icon={<MaterialIcons name="shopping-cart" size={24} color="#fff" />}
					color={colors.secondary}
					trend="up"
					trendValue="5% from last month"
				/>
			</View>

			<View style={styles.statsRow}>
				<DashboardCard title="Products" value={stats.totalProducts} icon={<MaterialIcons name="inventory" size={24} color="#fff" />} color={colors.success} onPress={() => navigateTo('/home')} />
				<DashboardCard
					title="Shops"
					value={stats.totalShops}
					icon={<MaterialIcons name="store" size={24} color="#fff" />}
					color={colors.warning}
					onPress={() => router.push('/(tabs)/business/my-shops' as any)}
				/>
			</View>

			<View style={[styles.chartContainer, { backgroundColor: colors.card }]}>
				<Text style={[styles.sectionTitle, { color: colors.text }]}>Sales Overview</Text>
				<LineChart
					data={stats.salesData}
					width={SCREEN_WIDTH - 48}
					height={220}
					chartConfig={{
						backgroundColor: colors.card,
						backgroundGradientFrom: colors.card,
						backgroundGradientTo: colors.card,
						decimalPlaces: 0,
						color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
						labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
						style: {
							borderRadius: 16
						},
						propsForDots: {
							r: '4',
							strokeWidth: '2',
							stroke: colors.primary
						}
					}}
					bezier
					style={styles.chart}
				/>
			</View>

			<View style={[styles.recentOrdersContainer, { backgroundColor: colors.card }]}>
				<View style={styles.sectionHeader}>
					<Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Orders</Text>
					<TouchableOpacity onPress={() => router.push('/home/orders')}>
						<Text style={{ color: colors.primary }}>View All</Text>
					</TouchableOpacity>
				</View>

				{stats.recentOrders.map((order) => (
					<TouchableOpacity
						key={order.id}
						style={styles.orderItem}
						onPress={() =>
							router.push({
								pathname: '/home/orders',
								params: { id: order.id }
							})
						}
					>
						<View style={styles.orderInfo}>
							<Text style={[styles.orderCustomer, { color: colors.text }]}>{order.customer}</Text>
							<Text style={[styles.orderDate, { color: colors.textSecondary }]}>{new Date(order.date).toLocaleDateString()}</Text>
						</View>
						<View style={styles.orderAmountContainer}>
							<Text style={[styles.orderAmount, { color: colors.text }]}>{formatCurrency(order.amount)}</Text>
							<View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.status)}20` }]}>
								<Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>{order.status}</Text>
							</View>
						</View>
					</TouchableOpacity>
				))}
			</View>

			<View style={[styles.quickActionsContainer, { backgroundColor: colors.card }]}>
				<Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>Quick Actions</Text>
				<View style={styles.quickActionsGrid}>
					<TouchableOpacity style={styles.quickAction} onPress={() => navigateTo('/home')}>
						<View style={[styles.actionIcon, { backgroundColor: `${colors.primary}20` }]}>
							<MaterialIcons name="add-circle" size={24} color={colors.primary} />
						</View>
						<Text style={[styles.actionText, { color: colors.text }]}>Add Product</Text>
					</TouchableOpacity>

					<TouchableOpacity style={styles.quickAction} onPress={() => navigateTo('/home')}>
						<View style={[styles.actionIcon, { backgroundColor: `${colors.success}20` }]}>
							<MaterialIcons name="add-shopping-cart" size={24} color={colors.success} />
						</View>
						<Text style={[styles.actionText, { color: colors.text }]}>New Order</Text>
					</TouchableOpacity>

					<TouchableOpacity style={styles.quickAction} onPress={() => navigateTo('/home')}>
						<View style={[styles.actionIcon, { backgroundColor: `${colors.info}20` }]}>
							<MaterialIcons name="insights" size={24} color={colors.info} />
						</View>
						<Text style={[styles.actionText, { color: colors.text }]}>Analytics</Text>
					</TouchableOpacity>

					<TouchableOpacity style={styles.quickAction} onPress={() => navigateTo('/home')}>
						<View style={[styles.actionIcon, { backgroundColor: `${colors.warning}20` }]}>
							<Ionicons name="settings-outline" size={24} color={colors.warning} />
						</View>
						<Text style={[styles.actionText, { color: colors.text }]}>Settings</Text>
					</TouchableOpacity>
				</View>
			</View>

			<View style={[styles.metricsContainer, { backgroundColor: colors.card }]}>
				<Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>Performance Metrics</Text>
				<View style={styles.metricsGrid}>
					<View style={styles.metricItem}>
						<Text style={[styles.metricValue, { color: colors.primary }]}>{stats.avgOrderValue.toFixed(2)}</Text>
						<Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Avg. Order Value</Text>
					</View>
					<View style={styles.metricItem}>
						<Text style={[styles.metricValue, { color: colors.success }]}>{stats.orderCompletionRate}%</Text>
						<Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Completion Rate</Text>
					</View>
				</View>
			</View>
		</ScrollView>
	)
}

const createStyles = (colors: any, isDark: boolean) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: colors.background
		},
		scrollContainer: {
			padding: 16,
			paddingBottom: 32
		},
		loadingContainer: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
			backgroundColor: colors.background
		},
		header: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: 24
		},
		headerTitle: {
			fontSize: 24,
			fontWeight: 'bold'
		},
		statsRow: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			marginBottom: 16
		},
		card: {
			flex: 1,
			borderRadius: 12,
			padding: 16,
			marginHorizontal: 4,
			elevation: 2,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.1,
			shadowRadius: 4
		},
		cardIconContainer: {
			marginBottom: 12
		},
		cardIcon: {
			width: 40,
			height: 40,
			borderRadius: 20,
			justifyContent: 'center',
			alignItems: 'center'
		},
		cardContent: {
			flex: 1
		},
		cardValue: {
			fontSize: 22,
			fontWeight: 'bold',
			color: '#fff',
			marginBottom: 4
		},
		cardTitle: {
			fontSize: 14,
			color: 'rgba(255, 255, 255, 0.8)',
			marginBottom: 8
		},
		trendContainer: {
			flexDirection: 'row',
			alignItems: 'center'
		},
		trendIcon: {
			marginRight: 4
		},
		trendText: {
			fontSize: 12,
			fontWeight: '500'
		},
		chartContainer: {
			borderRadius: 12,
			padding: 16,
			marginBottom: 16,
			elevation: 2,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.1,
			shadowRadius: 4
		},
		chart: {
			marginVertical: 8,
			borderRadius: 12
		},
		sectionHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: 16
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: '600'
		},
		recentOrdersContainer: {
			borderRadius: 12,
			padding: 16,
			marginBottom: 16,
			elevation: 2,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.1,
			shadowRadius: 4
		},
		orderItem: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: colors.border
		},
		orderInfo: {
			flex: 1
		},
		orderCustomer: {
			fontSize: 15,
			fontWeight: '500',
			marginBottom: 4
		},
		orderDate: {
			fontSize: 12
		},
		orderAmountContainer: {
			alignItems: 'flex-end'
		},
		orderAmount: {
			fontSize: 15,
			fontWeight: '600',
			marginBottom: 4
		},
		statusBadge: {
			paddingHorizontal: 8,
			paddingVertical: 2,
			borderRadius: 10,
			alignSelf: 'flex-end'
		},
		statusText: {
			fontSize: 12,
			fontWeight: '500',
			textTransform: 'capitalize'
		},
		quickActionsContainer: {
			borderRadius: 12,
			padding: 16,
			marginBottom: 16,
			elevation: 2,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.1,
			shadowRadius: 4
		},
		quickActionsGrid: {
			flexDirection: 'row',
			flexWrap: 'wrap',
			marginHorizontal: -8
		},
		quickAction: {
			width: '50%',
			padding: 8,
			alignItems: 'center',
			marginBottom: 16
		},
		actionIcon: {
			width: 56,
			height: 56,
			borderRadius: 16,
			justifyContent: 'center',
			alignItems: 'center',
			marginBottom: 8
		},
		actionText: {
			fontSize: 13,
			textAlign: 'center',
			paddingHorizontal: 4
		},
		metricsContainer: {
			borderRadius: 12,
			padding: 16,
			elevation: 2,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.1,
			shadowRadius: 4
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
			fontSize: 22,
			fontWeight: 'bold',
			marginBottom: 4
		},
		metricLabel: {
			fontSize: 13,
			textAlign: 'center'
		}
	})

export default BusinessDashboard
