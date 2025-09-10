import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'

const { width } = Dimensions.get('window')
const CARD_WIDTH = width * 0.9

const createStyles = (colors: any) =>
	StyleSheet.create({
		container: {
			flex: 1,
			padding: 16,
			backgroundColor: colors.background
		},
		header: {
			marginBottom: 24
		},
		title: {
			fontSize: 28,
			fontWeight: 'bold',
			color: colors.text,
			marginBottom: 8
		},
		subtitle: {
			fontSize: 16,
			color: colors.textSecondary
		},
		// Stat Card Styles
		statsContainer: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			marginBottom: 16
		},
		statCard: {
			flex: 1,
			padding: 16,
			borderRadius: 12,
			marginHorizontal: 4,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.1,
			shadowRadius: 4,
			elevation: 2,
			backgroundColor: colors.card
		},
		iconContainer: {
			width: 48,
			height: 48,
			borderRadius: 24,
			justifyContent: 'center',
			alignItems: 'center',
			marginBottom: 12
		},
		statValue: {
			fontSize: 24,
			fontWeight: 'bold',
			marginBottom: 4,
			color: colors.text
		},
		statTitle: {
			fontSize: 14,
			opacity: 0.8,
			color: colors.textSecondary
		},
		// Section Styles
		section: {
			backgroundColor: colors.card,
			borderRadius: 12,
			padding: 16,
			marginBottom: 16,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.1,
			shadowRadius: 4,
			elevation: 2
		},
		sectionHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: 16
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: '600',
			color: colors.text
		},
		seeAll: {
			fontSize: 14,
			color: colors.primary,
			fontWeight: '500'
		},
		// Action Buttons
		actionsContainer: {
			flexDirection: 'row',
			justifyContent: 'space-between'
		},
		actionButton: {
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			padding: 12,
			borderRadius: 8,
			marginHorizontal: 4
		},
		actionText: {
			marginLeft: 8,
			fontWeight: '500'
		},
		// Activity Section
		activityContainer: {
			minHeight: 100,
			justifyContent: 'center',
			alignItems: 'center'
		},
		noActivity: {
			fontSize: 14,
			color: colors.textSecondary,
			opacity: 0.7
		}
	})

interface StatCardProps {
	title: string
	value: string | number
	icon: string
	color: string
	onPress?: () => void
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, onPress }) => {
	const { colors } = useTheme()
	const styles = createStyles(colors)

	return (
		<TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.8}>
			<View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
				<MaterialIcons name={icon as any} size={24} color={color} />
			</View>
			<Text style={styles.statValue}>{value}</Text>
			<Text style={styles.statTitle}>{title}</Text>
		</TouchableOpacity>
	)
}

const CustomerDashboard = () => {
	const { colors } = useTheme()
	const router = useRouter()
	const [refreshing, setRefreshing] = useState(false)
	const [stats, setStats] = useState({
		totalOrders: 0,
		pendingOrders: 0,
		completedOrders: 0,
		totalSpent: 0
	})

	const styles = createStyles(colors)

	const loadDashboardData = async () => {
		try {
			// TODO: Replace with actual API calls
			// const response = await getCustomerDashboardData();
			// setStats(response.data);

			// Mock data for now
			setStats({
				totalOrders: 12,
				pendingOrders: 2,
				completedOrders: 10,
				totalSpent: 1245.5
			})
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

	const onOrdersPress = () => {
		router.push('/home/orders' as any)
	}

	useEffect(() => {
		loadDashboardData()
	}, [])

	return (
		<ScrollView
			style={[styles.container, { backgroundColor: colors.background }]}
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
		>
			<View style={styles.header}>
				<Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
				<Text style={[styles.subtitle, { color: colors.textSecondary }]}>Welcome back! Here's your activity summary.</Text>
			</View>

			<View style={styles.statsContainer}>
				<StatCard title="Total Orders" value={stats.totalOrders} icon="shopping-bag" color="#4CAF50" onPress={() => router.push('/home/orders' as any)} />
				<StatCard title="Pending" value={stats.pendingOrders} icon="hourglass-empty" color="#FFA000" onPress={() => router.push({ pathname: '/home/orders', params: { filter: 'pending' } } as any)} />
			</View>

			<View style={styles.statsContainer}>
				<StatCard
					title="Completed"
					value={stats.completedOrders}
					icon="check-circle"
					color="#2196F3"
					onPress={() => router.push({ pathname: '/home/orders', params: { filter: 'completed' } } as any)}
				/>
				<StatCard title="Total Spent" value={`${stats.totalSpent.toFixed(2)} TND`} icon="attach-money" color="#9C27B0" />
			</View>

			<View style={[styles.section, { backgroundColor: colors.card }]}>
				<View style={styles.sectionHeader}>
					<Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
				</View>
				<View style={styles.actionsContainer}>
					<TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]} onPress={() => router.push('/home/shops' as any)}>
						<MaterialIcons name="store" size={24} color={colors.primary} />
						<Text style={[styles.actionText, { color: colors.primary }]}>Browse Shops</Text>
					</TouchableOpacity>
					<TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.secondary + '20' }]} onPress={onOrdersPress}>
						<MaterialIcons name="receipt" size={24} color={colors.secondary} />
						<Text style={[styles.actionText, { color: colors.secondary }]}>My Orders</Text>
					</TouchableOpacity>
				</View>
			</View>

			<View style={[styles.section, { backgroundColor: colors.card }]}>
				<View style={styles.sectionHeader}>
					<Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
					<TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
						<Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
					</TouchableOpacity>
				</View>
				<View style={styles.activityContainer}>
					<Text style={[styles.noActivity, { color: colors.textSecondary }]}>No recent activity</Text>
					{/* TODO: Add actual recent orders list */}
				</View>
			</View>
		</ScrollView>
	)
}

export default CustomerDashboard
