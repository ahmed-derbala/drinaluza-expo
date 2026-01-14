import React, { useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions, ActivityIndicator, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '../../contexts/ThemeContext'
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons'
import ScreenHeader from '../common/ScreenHeader'
import { getMyBusiness, MyBusiness } from './business.api'
import { parseError } from '../../utils/errorHandler'
import ErrorState from '../common/ErrorState'
import { LinearGradient } from 'expo-linear-gradient'
import { showAlert } from '../../utils/popup'

type ActionButtonProps = {
	icon: React.ReactNode
	onPress: () => void
	count?: number
}

const ActionButton = ({ icon, onPress, count }: ActionButtonProps) => {
	const { colors } = useTheme()
	return (
		<TouchableOpacity onPress={onPress} style={[styles.actionCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
			<View style={[styles.actionIcon, { backgroundColor: `${colors.primary}15` }]}>{icon}</View>
			{count !== undefined && (
				<View style={[styles.countBadge, { backgroundColor: colors.primaryContainer }]}>
					<Text style={[styles.countText, { color: colors.primary }]}>{count}</Text>
				</View>
			)}
		</TouchableOpacity>
	)
}

const BusinessDashboard = () => {
	const { colors } = useTheme()
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
		}
	}, [])

	React.useEffect(() => {
		loadBusiness()
	}, [loadBusiness])

	const actions = useMemo(
		() => [
			{
				icon: <MaterialIcons name="store" size={26} color={colors.primary} />,
				onPress: () => router.push('/home/business/my-shops' as any),
				count: business?.shopsCount
			},
			{
				icon: <MaterialIcons name="inventory" size={26} color={colors.success} />,
				onPress: () => router.push('/home/business/my-products' as any),
				count: business?.productsCount
			},
			{
				icon: <MaterialIcons name="receipt-long" size={26} color={colors.info} />,
				onPress: () => router.push('/home/business/sales' as any),
				count: business?.salessCount
			}
		],
		[colors, router, business]
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
						<LinearGradient colors={[colors.primaryContainer, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
							<View style={styles.heroInfo}>
								<View style={styles.badgeContainer}>
									<View style={[styles.statusBadge, { backgroundColor: business.state?.code === 'active' ? colors.success + '25' : colors.warning + '25' }]}>
										<View style={[styles.statusDot, { backgroundColor: business.state?.code === 'active' ? colors.success : colors.warning }]} />
										<Text style={[styles.statusText, { color: business.state?.code === 'active' ? colors.success : colors.warning }]}>{business.state?.code?.toUpperCase() || 'UNKNOWN'}</Text>
									</View>
								</View>
								<Text style={[styles.businessName, { color: colors.text }]}>{business.name?.en || 'Business Name'}</Text>
								<Text style={[styles.businessSlug, { color: colors.textSecondary }]}>@{business.slug || 'business'}</Text>
							</View>
							<View style={styles.heroIconContainer}>
								<FontAwesome5 name="anchor" size={44} color={colors.primary} style={{ opacity: 0.4 }} />
							</View>
						</LinearGradient>
					</View>
				)}

				{/* Quick Actions - Icons Only */}
				<View style={styles.section}>
					<View style={[styles.actionsGrid, isWide && styles.actionsGridWide]}>
						{actions.map((action, index) => (
							<ActionButton key={index} {...action} />
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
		marginBottom: 20
	},
	actionsGrid: {
		flexDirection: 'row',
		gap: 12,
		justifyContent: 'center'
	},
	actionsGridWide: {
		justifyContent: 'flex-start'
	},
	actionCard: {
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
		minWidth: 90,
		gap: 8,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 4
			},
			android: {
				elevation: 3
			}
		})
	},
	actionIcon: {
		width: 56,
		height: 56,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center'
	},
	countBadge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 10
	},
	countText: {
		fontSize: 15,
		fontWeight: '700'
	},
	heroSection: {
		marginTop: 16,
		marginBottom: 28
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
	}
})

export default BusinessDashboard
