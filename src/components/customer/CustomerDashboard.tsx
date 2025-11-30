import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions, Animated } from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'

const { width } = Dimensions.get('window')
const CARD_WIDTH = width * 0.9

const createStyles = (colors: any, isDark: boolean) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: colors.background
		},
		scrollContent: {
			padding: 20,
			paddingBottom: 40
		},
		// Header Styles
		header: {
			marginBottom: 32
		},
		greeting: {
			fontSize: 16,
			color: colors.textSecondary,
			marginBottom: 4,
			fontWeight: '500'
		},
		title: {
			fontSize: 32,
			fontWeight: 'bold',
			color: colors.text,
			marginBottom: 8,
			letterSpacing: -0.5
		},
		subtitle: {
			fontSize: 15,
			color: colors.textTertiary,
			lineHeight: 22
		},
		// Stat Card Styles with Gradients
		statsContainer: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			marginBottom: 20,
			gap: 12
		},
		statCard: {
			flex: 1,
			borderRadius: 20,
			overflow: 'hidden',
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 8 },
			shadowOpacity: 0.15,
			shadowRadius: 12,
			elevation: 8
		},
		statCardGradient: {
			padding: 20,
			minHeight: 140,
			justifyContent: 'space-between'
		},
		statCardHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'flex-start',
			marginBottom: 16
		},
		iconContainer: {
			width: 48,
			height: 48,
			borderRadius: 16,
			justifyContent: 'center',
			alignItems: 'center',
			backgroundColor: 'rgba(255, 255, 255, 0.25)'
		},
		trendBadge: {
			flexDirection: 'row',
			alignItems: 'center',
			backgroundColor: 'rgba(255, 255, 255, 0.2)',
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 12
		},
		trendText: {
			color: '#fff',
			fontSize: 11,
			fontWeight: '600',
			marginLeft: 2
		},
		statValue: {
			fontSize: 28,
			fontWeight: 'bold',
			color: '#fff',
			marginBottom: 4,
			letterSpacing: -0.5
		},
		statTitle: {
			fontSize: 13,
			color: 'rgba(255, 255, 255, 0.9)',
			fontWeight: '600',
			textTransform: 'uppercase',
			letterSpacing: 0.5
		},
		// Section Styles
		section: {
			backgroundColor: colors.card,
			borderRadius: 20,
			padding: 20,
			marginBottom: 20,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: isDark ? 0.3 : 0.08,
			shadowRadius: 8,
			elevation: 4,
			borderWidth: 1,
			borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
		},
		sectionHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: 20
		},
		sectionTitle: {
			fontSize: 20,
			fontWeight: '700',
			color: colors.text,
			letterSpacing: -0.3
		},
		seeAll: {
			fontSize: 14,
			color: colors.primary,
			fontWeight: '600'
		},
		// Action Buttons
		actionsGrid: {
			flexDirection: 'row',
			flexWrap: 'wrap',
			marginHorizontal: -6
		},
		actionButton: {
			width: '50%',
			padding: 6
		},
		actionButtonInner: {
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center',
			padding: 20,
			borderRadius: 16,
			borderWidth: 1.5,
			borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
			backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'
		},
		actionIconContainer: {
			width: 56,
			height: 56,
			borderRadius: 16,
			justifyContent: 'center',
			alignItems: 'center',
			marginBottom: 12
		},
		actionText: {
			fontSize: 14,
			fontWeight: '600',
			textAlign: 'center',
			color: colors.text
		},
		actionSubtext: {
			fontSize: 11,
			color: colors.textTertiary,
			marginTop: 2,
			textAlign: 'center'
		},
		// Recent Orders
		orderItem: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingVertical: 16,
			borderBottomWidth: 1,
			borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
		},
		orderItemLast: {
			borderBottomWidth: 0
		},
		orderIconContainer: {
			width: 48,
			height: 48,
			borderRadius: 14,
			justifyContent: 'center',
			alignItems: 'center',
			marginRight: 14
		},
		orderInfo: {
			flex: 1
		},
		orderTitle: {
			fontSize: 15,
			fontWeight: '600',
			color: colors.text,
			marginBottom: 4
		},
		orderDate: {
			fontSize: 13,
			color: colors.textTertiary
		},
		orderAmount: {
			fontSize: 16,
			fontWeight: '700',
			color: colors.text,
			marginBottom: 4
		},
		orderStatus: {
			fontSize: 11,
			fontWeight: '600',
			textTransform: 'uppercase',
			letterSpacing: 0.5
		},
		emptyState: {
			alignItems: 'center',
			justifyContent: 'center',
			paddingVertical: 40
		},
		emptyStateIcon: {
			width: 80,
			height: 80,
			borderRadius: 40,
			justifyContent: 'center',
			alignItems: 'center',
			marginBottom: 16,
			backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'
		},
		emptyStateText: {
			fontSize: 15,
			color: colors.textSecondary,
			fontWeight: '500',
			marginBottom: 4
		},
		emptyStateSubtext: {
			fontSize: 13,
			color: colors.textTertiary,
			textAlign: 'center'
		}
	})

interface StatCardProps {
	title: string
	value: string | number
	icon: string
	gradient: string[]
	trend?: string
	onPress?: () => void
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, gradient, trend, onPress }) => {
	const { colors, isDark } = useTheme()
	const styles = createStyles(colors, isDark)
	const scaleAnim = new Animated.Value(1)

	const handlePressIn = () => {
		Animated.spring(scaleAnim, {
			toValue: 0.96,
			useNativeDriver: true
		}).start()
	}

	const handlePressOut = () => {
		Animated.spring(scaleAnim, {
			toValue: 1,
			friction: 3,
			tension: 40,
			useNativeDriver: true
		}).start()
	}

	return (
		<Animated.View style={[styles.statCard, { transform: [{ scale: scaleAnim }] }]}>
			<TouchableOpacity onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={0.9}>
				<LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statCardGradient}>
					<View style={styles.statCardHeader}>
						<View style={styles.iconContainer}>
							<MaterialIcons name={icon as any} size={24} color="#fff" />
						</View>
						{trend && (
							<View style={styles.trendBadge}>
								<Ionicons name="trending-up" size={12} color="#fff" />
								<Text style={styles.trendText}>{trend}</Text>
							</View>
						)}
					</View>
					<View>
						<Text style={styles.statValue}>{value}</Text>
						<Text style={styles.statTitle}>{title}</Text>
					</View>
				</LinearGradient>
			</TouchableOpacity>
		</Animated.View>
	)
}

interface Order {
	id: string
	shopName: string
	amount: number
	status: 'pending' | 'completed' | 'cancelled'
	date: string
}

const CustomerDashboard = () => {
	const { colors, isDark } = useTheme()
	const router = useRouter()
	const [refreshing, setRefreshing] = useState(false)
	const [stats, setStats] = useState({
		totalOrders: 0,
		pendingOrders: 0,
		completedOrders: 0,
		totalSpent: 0
	})
	const [recentOrders, setRecentOrders] = useState<Order[]>([])

	const styles = createStyles(colors, isDark)

	const loadDashboardData = async () => {
		try {
			// TODO: Replace with actual API calls
			// const response = await getCustomerDashboardData();
			// setStats(response.data);

			// Mock data for now
			setStats({
				totalOrders: 24,
				pendingOrders: 3,
				completedOrders: 19,
				totalSpent: 2847.5
			})

			// Mock recent orders
			setRecentOrders([
				{
					id: '1',
					shopName: 'Fresh Market',
					amount: 125.5,
					status: 'completed',
					date: '2 hours ago'
				},
				{
					id: '2',
					shopName: 'Tech Store',
					amount: 450.0,
					status: 'pending',
					date: '1 day ago'
				},
				{
					id: '3',
					shopName: 'Fashion Boutique',
					amount: 89.99,
					status: 'completed',
					date: '3 days ago'
				}
			])
		} catch (error) {
			console.error('Error loading dashboard data:', error)
		} finally {
			setRefreshing(false)
		}
	}

	const onRefresh = () => {
		setRefreshing(true)
		loadDashboardData()
	}

	useEffect(() => {
		loadDashboardData()
	}, [])

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'completed':
				return colors.success
			case 'pending':
				return colors.warning
			case 'cancelled':
				return colors.error
			default:
				return colors.textSecondary
		}
	}

	const getOrderIcon = (status: string) => {
		switch (status) {
			case 'completed':
				return 'checkmark-circle'
			case 'pending':
				return 'time'
			case 'cancelled':
				return 'close-circle'
			default:
				return 'receipt'
		}
	}

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.scrollContent}
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
			showsVerticalScrollIndicator={false}
		>
			<View style={styles.header}>
				<Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}!</Text>
				<Text style={styles.title}>Dashboard</Text>
				<Text style={styles.subtitle}>Track your orders and explore new products</Text>
			</View>

			<View style={styles.statsContainer}>
				<StatCard title="Total Orders" value={stats.totalOrders} icon="shopping-bag" gradient={['#667eea', '#764ba2']} trend="+12%" onPress={() => router.push('/home/orders' as any)} />
				<StatCard
					title="Pending"
					value={stats.pendingOrders}
					icon="hourglass-empty"
					gradient={['#f093fb', '#f5576c']}
					onPress={() => router.push({ pathname: '/home/orders', params: { filter: 'pending' } } as any)}
				/>
			</View>

			<View style={styles.statsContainer}>
				<StatCard
					title="Completed"
					value={stats.completedOrders}
					icon="check-circle"
					gradient={['#4facfe', '#00f2fe']}
					trend="+8%"
					onPress={() => router.push({ pathname: '/home/orders', params: { filter: 'completed' } } as any)}
				/>
				<StatCard title="Total Spent" value={`${stats.totalSpent.toFixed(0)} TND`} icon="payments" gradient={['#43e97b', '#38f9d7']} trend="+15%" />
			</View>

			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Quick Actions</Text>
				</View>
				<View style={styles.actionsGrid}>
					<View style={styles.actionButton}>
						<TouchableOpacity style={styles.actionButtonInner} onPress={() => router.push('/home/shops' as any)} activeOpacity={0.7}>
							<View style={[styles.actionIconContainer, { backgroundColor: colors.primary + '15' }]}>
								<MaterialIcons name="store" size={28} color={colors.primary} />
							</View>
							<Text style={styles.actionText}>Browse Shops</Text>
							<Text style={styles.actionSubtext}>Discover stores</Text>
						</TouchableOpacity>
					</View>
					<View style={styles.actionButton}>
						<TouchableOpacity style={styles.actionButtonInner} onPress={() => router.push('/home/orders' as any)} activeOpacity={0.7}>
							<View style={[styles.actionIconContainer, { backgroundColor: colors.secondary + '15' }]}>
								<MaterialIcons name="receipt-long" size={28} color={colors.secondary} />
							</View>
							<Text style={styles.actionText}>My Orders</Text>
							<Text style={styles.actionSubtext}>Track orders</Text>
						</TouchableOpacity>
					</View>
					<View style={styles.actionButton}>
						<TouchableOpacity style={styles.actionButtonInner} onPress={() => router.push('/home' as any)} activeOpacity={0.7}>
							<View style={[styles.actionIconContainer, { backgroundColor: colors.success + '15' }]}>
								<MaterialIcons name="local-offer" size={28} color={colors.success} />
							</View>
							<Text style={styles.actionText}>Deals</Text>
							<Text style={styles.actionSubtext}>Special offers</Text>
						</TouchableOpacity>
					</View>
					<View style={styles.actionButton}>
						<TouchableOpacity style={styles.actionButtonInner} onPress={() => router.push('/home' as any)} activeOpacity={0.7}>
							<View style={[styles.actionIconContainer, { backgroundColor: colors.warning + '15' }]}>
								<MaterialIcons name="favorite" size={28} color={colors.warning} />
							</View>
							<Text style={styles.actionText}>Favorites</Text>
							<Text style={styles.actionSubtext}>Saved items</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>

			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Recent Orders</Text>
					<TouchableOpacity onPress={() => router.push('/home/orders' as any)}>
						<Text style={styles.seeAll}>See All</Text>
					</TouchableOpacity>
				</View>
				{recentOrders.length > 0 ? (
					recentOrders.map((order, index) => (
						<TouchableOpacity
							key={order.id}
							style={[styles.orderItem, index === recentOrders.length - 1 && styles.orderItemLast]}
							onPress={() => router.push(`/home/orders/${order.id}` as any)}
							activeOpacity={0.7}
						>
							<View style={[styles.orderIconContainer, { backgroundColor: getStatusColor(order.status) + '15' }]}>
								<Ionicons name={getOrderIcon(order.status) as any} size={24} color={getStatusColor(order.status)} />
							</View>
							<View style={styles.orderInfo}>
								<Text style={styles.orderTitle}>{order.shopName}</Text>
								<Text style={styles.orderDate}>{order.date}</Text>
							</View>
							<View style={{ alignItems: 'flex-end' }}>
								<Text style={styles.orderAmount}>{order.amount.toFixed(2)} TND</Text>
								<Text style={[styles.orderStatus, { color: getStatusColor(order.status) }]}>{order.status}</Text>
							</View>
						</TouchableOpacity>
					))
				) : (
					<View style={styles.emptyState}>
						<View style={styles.emptyStateIcon}>
							<MaterialIcons name="shopping-bag" size={40} color={colors.textTertiary} />
						</View>
						<Text style={styles.emptyStateText}>No recent orders</Text>
						<Text style={styles.emptyStateSubtext}>Start shopping to see your orders here</Text>
					</View>
				)}
			</View>
		</ScrollView>
	)
}

export default CustomerDashboard
