import React, { useMemo, useCallback, useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions, ActivityIndicator, Platform, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '../../core/contexts/ThemeContext'
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons'
import ScreenHeader from '../common/ScreenHeader'
import { getMyBusiness, MyBusiness } from './business.api'
import { parseError } from '../../core/helpers/errorHandler'
import ErrorState from '../common/ErrorState'
import { LinearGradient } from 'expo-linear-gradient'
import { showAlert } from '../../core/helpers/popup'

type ActionButtonProps = {
	icon: React.ReactNode
	onPress: () => void
	count?: number
	color: string
}

const ActionButton = ({ icon, onPress, count, color }: ActionButtonProps) => {
	const { colors } = useTheme()
	return (
		<View style={styles.actionItem}>
			<TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.actionCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
				<LinearGradient colors={[`${color}15`, `${color}05`]} style={styles.actionGradient} />
				<View style={[styles.actionIcon, { backgroundColor: `${color}20` }]}>{icon}</View>
				{count !== undefined && (
					<View style={[styles.countBadge, { backgroundColor: color }]}>
						<Text style={styles.countText}>{count}</Text>
					</View>
				)}
			</TouchableOpacity>
		</View>
	)
}

const BusinessDashboard = () => {
	const { colors } = useTheme()
	const router = useRouter()
	const { width } = useWindowDimensions()
	const isWide = width > 720
	const contentWidth = Math.min(width, 960)

	const [business, setBusiness] = useState<MyBusiness | null>(null)
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)

	const loadBusiness = useCallback(async () => {
		try {
			if (!refreshing) setLoading(true)
			setError(null)
			const response = await getMyBusiness()
			setBusiness(response.data)
		} catch (err: any) {
			console.error('Failed to load business:', err)

			if (err.response?.status === 401) {
				showAlert('Session Expired', 'Please log in again to continue.')
				router.replace('/auth')
				return
			}

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
	}, [refreshing, router])

	useEffect(() => {
		loadBusiness()
	}, [loadBusiness])

	const onRefresh = useCallback(() => {
		setRefreshing(true)
		loadBusiness()
	}, [loadBusiness])

	const actions = useMemo(
		() => [
			{
				label: 'Shops',
				icon: <MaterialIcons name="store" size={28} color={colors.primary} />,
				onPress: () => router.push('/(home)/business/my-shops' as any),
				count: business?.shopsCount,
				color: colors.primary
			},
			{
				label: 'Products',
				icon: <MaterialIcons name="inventory" size={28} color={colors.success} />,
				onPress: () => router.push('/(home)/business/my-products' as any),
				count: business?.productsCount,
				color: colors.success
			},
			{
				label: 'Sales',
				icon: <MaterialIcons name="receipt-long" size={28} color={colors.info} />,
				onPress: () => router.push('/(home)/business/sales' as any),
				count: business?.salessCount,
				color: colors.info
			}
		],
		[colors, router, business]
	)

	if (loading && !refreshing) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	if (error) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<ScreenHeader title="Business" showBack={false} />
				<ErrorState title={error.title} message={error.message} onRetry={loadBusiness} icon={error.type === 'network' || error.type === 'timeout' ? 'cloud-offline-outline' : 'alert-circle-outline'} />
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScreenHeader
				title="Business"
				subtitle={business?.name?.en || 'Manage your business'}
				showBack={false}
				rightActions={
					<TouchableOpacity onPress={onRefresh} style={styles.headerIcon}>
						<Ionicons name={refreshing ? 'hourglass' : 'refresh'} size={22} color={colors.text} />
					</TouchableOpacity>
				}
			/>

			<ScrollView
				contentContainerStyle={[styles.scrollContainer, { width: contentWidth }]}
				showsVerticalScrollIndicator={false}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
			>
				{/* Business Hero */}
				{business && (
					<View style={styles.heroSection}>
						<LinearGradient colors={[colors.primaryContainer, colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
							<View style={styles.heroInfo}>
								<View style={styles.badgeContainer}>
									<View style={[styles.statusBadge, { backgroundColor: business.state?.code === 'active' ? colors.success + '20' : colors.warning + '20' }]}>
										<View style={[styles.statusDot, { backgroundColor: business.state?.code === 'active' ? colors.success : colors.warning }]} />
										<Text style={[styles.statusText, { color: business.state?.code === 'active' ? colors.success : colors.warning }]}>{business.state?.code?.toUpperCase() || 'UNKNOWN'}</Text>
									</View>
								</View>
								<Text style={[styles.businessName, { color: colors.text }]}>{business.name?.en || 'Business Name'}</Text>
								<Text style={[styles.businessSlug, { color: colors.textSecondary }]}>@{business.slug || 'business'}</Text>
							</View>
							<View style={styles.heroIconContainer}>
								<LinearGradient colors={[colors.primary + '30', 'transparent']} style={styles.heroIconBg}>
									<FontAwesome5 name="anchor" size={44} color={colors.primary} style={{ opacity: 0.6 }} />
								</LinearGradient>
							</View>
						</LinearGradient>
					</View>
				)}

				{/* Quick Actions - Enhanced Icon Grid */}
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={[styles.sectionTitle, { color: colors.text }]}>Management</Text>
					</View>
					<View style={[styles.actionsGrid, isWide && styles.actionsGridWide]}>
						{actions.map((action, index) => (
							<ActionButton key={index} {...action} />
						))}
					</View>
				</View>

				{/* Insights Placeholders */}
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={[styles.sectionTitle, { color: colors.text }]}>Insights</Text>
					</View>
					<View style={styles.insightCard}>
						<LinearGradient colors={[colors.surface, colors.background]} style={styles.insightGradient} />
						<MaterialIcons name="insights" size={32} color={colors.primary} style={{ opacity: 0.5 }} />
						<Text style={[styles.insightText, { color: colors.textSecondary }]}>Detailed analytics coming soon</Text>
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
	section: {
		marginBottom: 28
	},
	sectionHeader: {
		marginBottom: 16
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		letterSpacing: -0.5
	},
	actionsGrid: {
		flexDirection: 'row',
		gap: 16,
		justifyContent: 'space-between'
	},
	actionsGridWide: {
		justifyContent: 'flex-start'
	},
	actionItem: {
		flex: 1,
		alignItems: 'center',
		gap: 10
	},
	actionCard: {
		width: '100%',
		aspectRatio: 1,
		borderRadius: 24,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.1,
				shadowRadius: 8
			},
			android: {
				elevation: 4
			}
		})
	},
	actionGradient: {
		...StyleSheet.absoluteFillObject
	},
	actionIcon: {
		width: 64,
		height: 64,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center'
	},
	actionLabel: {
		fontSize: 13,
		fontWeight: '600'
	},
	countBadge: {
		position: 'absolute',
		top: 12,
		right: 12,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 10,
		minWidth: 24,
		alignItems: 'center'
	},
	countText: {
		fontSize: 12,
		fontWeight: '800',
		color: '#fff'
	},
	heroSection: {
		marginTop: 16,
		marginBottom: 32
	},
	heroCard: {
		borderRadius: 32,
		padding: 24,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.05)'
	},
	heroInfo: {
		flex: 1
	},
	badgeContainer: {
		flexDirection: 'row',
		marginBottom: 16
	},
	statusBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		gap: 8
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4
	},
	statusText: {
		fontSize: 10,
		fontWeight: '800',
		letterSpacing: 1
	},
	businessName: {
		fontSize: 28,
		fontWeight: '800',
		marginBottom: 4,
		letterSpacing: -0.5
	},
	businessSlug: {
		fontSize: 15,
		fontWeight: '600',
		opacity: 0.7
	},
	heroIconContainer: {
		marginLeft: 16
	},
	heroIconBg: {
		width: 80,
		height: 80,
		borderRadius: 40,
		justifyContent: 'center',
		alignItems: 'center'
	},
	headerIcon: {
		width: 40,
		height: 40,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center'
	},
	insightCard: {
		borderRadius: 24,
		padding: 32,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 16,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.05)',
		overflow: 'hidden'
	},
	insightGradient: {
		...StyleSheet.absoluteFillObject,
		opacity: 0.5
	},
	insightText: {
		fontSize: 14,
		fontWeight: '500',
		textAlign: 'center'
	}
})

export default BusinessDashboard
