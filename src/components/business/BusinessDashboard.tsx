import React, { useMemo, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '../../contexts/ThemeContext'
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons'
import ScreenHeader from '../common/ScreenHeader'
import { getMyBusiness, MyBusiness } from './business.api'
import { parseError } from '../../utils/errorHandler'
import ErrorState from '../common/ErrorState'
import { LinearGradient } from 'expo-linear-gradient'

type ActionButtonProps = {
	label: string
	icon: React.ReactNode
	onPress: () => void
	count?: number
}

const ActionButton = ({ label, icon, onPress, count }: ActionButtonProps) => {
	const { colors } = useTheme()
	return (
		<TouchableOpacity onPress={onPress} style={[styles.actionCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
			<View style={styles.actionTop}>
				<View style={[styles.actionIcon, { backgroundColor: `${colors.primary}12` }]}>{icon}</View>
				{count !== undefined && (
					<View style={styles.countBadge}>
						<Text style={[styles.countText, { color: colors.primary }]}>{count}</Text>
					</View>
				)}
			</View>
			<Text style={[styles.actionLabel, { color: colors.text }]}>{label}</Text>
		</TouchableOpacity>
	)
}

const BusinessDashboard = () => {
	const { colors, isDark } = useTheme()
	const router = useRouter()
	const { width } = useWindowDimensions()
	const isWide = width > 720
	const contentWidth = Math.min(width, 960)

	const [business, setBusiness] = React.useState<MyBusiness | null>(null)
	const [loading, setLoading] = React.useState(true)
	const [error, setError] = React.useState<{ title: string; message: string; type: string } | null>(null)

	const loadBusiness = React.useCallback(async () => {
		try {
			setLoading(true)
			setError(null)
			const response = await getMyBusiness()
			setBusiness(response.data)
		} catch (err: any) {
			console.error('Failed to load business:', err)
			const errorInfo = parseError(err)
			setError({
				title: errorInfo.title,
				message: errorInfo.message,
				type: errorInfo.type
			})
		} finally {
			setLoading(false)
		}
	}, [])

	React.useEffect(() => {
		loadBusiness()
	}, [loadBusiness])

	const actions = useMemo(
		() => [
			{
				label: 'Shops',
				icon: <MaterialIcons name="store" size={22} color={colors.primary} />,
				onPress: () => router.push('/home/business/my-shops' as any),
				count: business?.shopsCount
			},
			{
				label: 'Products',
				icon: <MaterialIcons name="inventory" size={22} color={colors.success} />,
				onPress: () => router.push('/home/business/my-products' as any),
				count: business?.productsCount
			},
			{
				label: 'Sales',
				icon: <MaterialIcons name="receipt-long" size={22} color={colors.info} />,
				onPress: () => router.push('/home/business/sales' as any),
				count: business?.salessCount
			}
		],
		[colors.info, colors.primary, colors.success, router, business]
	)

	if (loading) {
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
			<ScreenHeader title="Business" subtitle={business?.name?.en || 'Manage your business'} showBack={false} />

			<ScrollView contentContainerStyle={[styles.scrollContainer, { width: contentWidth }]} showsVerticalScrollIndicator={false}>
				{/* Business Hero */}
				{business && (
					<View style={styles.heroSection}>
						<LinearGradient colors={isDark ? ['#1e3a8a', '#1e40af'] : ['#ebf8ff', '#bee3f8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
							<View style={styles.heroInfo}>
								<View style={styles.badgeContainer}>
									<View style={[styles.statusBadge, { backgroundColor: business.state?.code === 'active' ? '#48bb7825' : '#ecc94b25' }]}>
										<View style={[styles.statusDot, { backgroundColor: business.state?.code === 'active' ? '#48bb78' : '#ecc94b' }]} />
										<Text style={[styles.statusText, { color: business.state?.code === 'active' ? '#48bb78' : '#ecc94b' }]}>{business.state?.code?.toUpperCase() || 'UNKNOWN'}</Text>
									</View>
								</View>
								<Text style={[styles.businessName, { color: isDark ? '#fff' : '#2c5282' }]}>{business.name?.en || 'Business Name'}</Text>
								<Text style={[styles.businessSlug, { color: isDark ? '#a0aec0' : '#4a5568' }]}>@{business.slug || 'business'}</Text>
							</View>
							<View style={styles.heroIconContainer}>
								<FontAwesome5 name="briefcase" size={40} color={isDark ? '#3b82f6' : '#4299e1'} opacity={0.3} />
							</View>
						</LinearGradient>
					</View>
				)}

				<View style={styles.section}>
					<Text style={[styles.sectionTitle, { color: colors.text }]}>Quick actions</Text>
					<View style={[styles.actionsGrid, isWide && styles.actionsGridWide]}>
						{actions.map((action) => (
							<ActionButton key={action.label} {...action} />
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
	section: {
		marginBottom: 20,
		marginTop: 20
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 16
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
		justifyContent: 'center'
	},
	actionTop: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		width: '100%',
		marginBottom: 12
	},
	countBadge: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 8,
		backgroundColor: 'rgba(0,0,0,0.05)'
	},
	countText: {
		fontSize: 16,
		fontWeight: '800'
	},
	actionLabel: {
		fontSize: 15,
		fontWeight: '600'
	},
	heroSection: {
		marginTop: 16,
		marginBottom: 24
	},
	heroCard: {
		borderRadius: 20,
		padding: 24,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		overflow: 'hidden'
	},
	heroInfo: {
		flex: 1
	},
	badgeContainer: {
		flexDirection: 'row',
		marginBottom: 12
	},
	statusBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 20,
		gap: 6
	},
	statusDot: {
		width: 6,
		height: 6,
		borderRadius: 3
	},
	statusText: {
		fontSize: 11,
		fontWeight: '800',
		letterSpacing: 0.5
	},
	businessName: {
		fontSize: 24,
		fontWeight: '800',
		marginBottom: 4
	},
	businessSlug: {
		fontSize: 14,
		fontWeight: '600'
	},
	heroIconContainer: {
		marginLeft: 16
	},
	statsRow: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 24
	},
	statCard: {
		flex: 1,
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12
	},
	statIcon: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center'
	},
	statValue: {
		fontSize: 18,
		fontWeight: '800'
	},
	statLabel: {
		fontSize: 12,
		fontWeight: '600'
	}
})

export default BusinessDashboard
