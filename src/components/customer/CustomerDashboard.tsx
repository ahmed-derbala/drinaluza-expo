import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'
import ScreenHeader from '../common/ScreenHeader'

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
}

type ActionCardProps = {
	label: string
	subtext: string
	icon: React.ReactNode
	onPress: () => void
}

const StatCard = ({ title, value, icon, accent, onPress }: StatCardProps) => {
	const { colors } = useTheme()

	return (
		<TouchableOpacity
			activeOpacity={0.9}
			onPress={onPress}
			style={[
				styles.statCard,
				{
					borderColor: `${accent}35`,
					backgroundColor: colors.card
				}
			]}
		>
			<View style={[styles.statIcon, { backgroundColor: `${accent}18` }]}>{icon}</View>
			<View style={styles.statBody}>
				<Text style={[styles.statLabel, { color: colors.textSecondary }]}>{title}</Text>
				<Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
			</View>
		</TouchableOpacity>
	)
}

const ActionCard = ({ label, subtext, icon, onPress }: ActionCardProps) => {
	const { colors } = useTheme()
	return (
		<TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[styles.actionCard, { borderColor: colors.border }]}>
			<View style={[styles.actionIcon, { backgroundColor: `${colors.primary}12` }]}>{icon}</View>
			<Text style={[styles.actionLabel, { color: colors.text }]}>{label}</Text>
			<Text style={[styles.actionSubtext, { color: colors.textSecondary }]}>{subtext}</Text>
		</TouchableOpacity>
	)
}

const CustomerDashboard = () => {
	const { colors } = useTheme()
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
			},
			{
				title: 'Total spent',
				value: `${Math.round(stats.totalSpent)} TND`,
				icon: <MaterialIcons name="account-balance-wallet" size={20} color={colors.info} />,
				accent: colors.info
			}
		],
		[colors.info, colors.primary, colors.success, colors.warning, router, stats.completedPurchases, stats.pendingPurchases, stats.totalPurchases, stats.totalSpent]
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
				title="Customer"
				subtitle="Stay on top of your shopping"
				showBack={false}
				rightActions={
					<TouchableOpacity onPress={onRefresh} accessibilityLabel="Refresh dashboard">
						<Ionicons name={refreshing ? 'refresh' : 'notifications-outline'} size={22} color={colors.text} />
					</TouchableOpacity>
				}
			/>

			<ScrollView
				contentContainerStyle={styles.scrollContent}
				refreshControl={<RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.section}>
					<Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
					<View style={styles.grid}>
						{statCards.map((card) => (
							<StatCard key={card.title} {...card} />
						))}
					</View>
				</View>

				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={[styles.sectionTitle, { color: colors.text }]}>Quick actions</Text>
					</View>
					<View style={styles.grid}>
						{actions.map((action) => (
							<ActionCard key={action.label} {...action} />
						))}
					</View>
				</View>

				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={[styles.sectionTitle, { color: colors.text }]}>Recent purchases</Text>
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
		paddingBottom: 28
	},
	section: {
		marginBottom: 20
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
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12
	},
	statCard: {
		flexBasis: '48%',
		borderRadius: 14,
		padding: 14,
		borderWidth: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 80
	},
	statIcon: {
		width: 42,
		height: 42,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center'
	},
	statBody: {
		flex: 1
	},
	statLabel: {
		fontSize: 13,
		fontWeight: '600'
	},
	statValue: {
		fontSize: 20,
		fontWeight: '700'
	},
	actionCard: {
		flexBasis: '48%',
		borderRadius: 14,
		padding: 14,
		borderWidth: 1,
		gap: 8
	},
	actionIcon: {
		width: 44,
		height: 44,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center'
	},
	actionLabel: {
		fontSize: 15,
		fontWeight: '700'
	},
	actionSubtext: {
		fontSize: 13
	},
	panel: {
		borderRadius: 14,
		borderWidth: 1,
		paddingHorizontal: 12,
		paddingVertical: 8
	},
	purchaseRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1
	},
	purchaseMeta: {
		flex: 1
	},
	purchaseTitle: {
		fontSize: 15,
		fontWeight: '700'
	},
	purchaseDate: {
		fontSize: 12,
		marginTop: 2
	},
	purchaseRight: {
		alignItems: 'flex-end',
		minWidth: 110
	},
	purchaseAmount: {
		fontSize: 15,
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
	},
	link: {
		fontSize: 14,
		fontWeight: '600'
	},
	emptyState: {
		alignItems: 'center',
		paddingVertical: 20,
		gap: 6
	},
	emptyText: {
		fontSize: 15,
		fontWeight: '700'
	},
	emptySubtext: {
		fontSize: 13,
		textAlign: 'center'
	}
})

export default CustomerDashboard
