import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform, Dimensions, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons'
import { useTheme } from '../../core/contexts/ThemeContext'
import ScreenHeader from '../common/ScreenHeader'
import { parseError, logError } from '../../core/helpers/errorHandler'
import ErrorState from '../common/ErrorState'
import { useUser } from '../../core/contexts/UserContext'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import SmartImage from '../../core/helpers/SmartImage'
import { getDashboard, getDashboardProfiles, getPersonalDashboard, getBusinessDashboard } from './dashboard.api'
import { DashboardData, DashboardProfile, DashboardRankItem, isBusinessDashboard, isPersonalDashboard, ProductStats } from './dashboard.interface'
import { LocalizedName } from '../businesses/businesses.interface'

const { width } = Dimensions.get('window')
const MEDALS = ['🥇', '🥈', '🥉']

type SelectedProfile = {
	kind: 'personal' | 'business'
	slug?: string
	profileId: string
}

const Dashboard = () => {
	const { colors } = useTheme()
	const styles = useMemo(() => createStyles(colors), [colors])
	const { localize, translate, user } = useUser()
	const router = useRouter()
	const { onScroll } = useScrollHandler()

	const [profiles, setProfiles] = useState<DashboardProfile[]>([])
	const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
	const [selectedProfile, setSelectedProfile] = useState<SelectedProfile | null>(null)
	const [refreshing, setRefreshing] = useState(false)
	const [loading, setLoading] = useState(true)
	const [switchingProfile, setSwitchingProfile] = useState(false)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)

	const showProfileSwitcher = profiles.length > 1

	const resolveSelectedFromData = useCallback((data: DashboardData, list: DashboardProfile[]): SelectedProfile => {
		if (isBusinessDashboard(data)) {
			const match = list.find((p) => p.kind === 'business' && p.slug === data.business.slug) || list.find((p) => p.kind === 'business')
			return {
				kind: 'business',
				slug: data.business.slug,
				profileId: match?._id || data._id
			}
		}
		const personal = list.find((p) => p.kind === 'personal')
		return { kind: 'personal', profileId: personal?._id || data._id }
	}, [])

	const fetchDashboardForProfile = useCallback(async (profile: SelectedProfile) => {
		if (profile.kind === 'personal') {
			return (await getPersonalDashboard()).data
		}
		if (profile.slug) {
			return (await getBusinessDashboard(profile.slug)).data
		}
		return (await getDashboard()).data
	}, [])

	const loadDashboard = useCallback(
		async (profileOverride?: SelectedProfile) => {
			try {
				setError(null)
				const [profilesRes, defaultRes] = await Promise.all([getDashboardProfiles(), getDashboard()])
				const profileList = profilesRes.data || []
				setProfiles(profileList)

				const data = profileOverride ? await fetchDashboardForProfile(profileOverride) : defaultRes.data
				setDashboardData(data)
				setSelectedProfile(profileOverride || resolveSelectedFromData(data, profileList))
			} catch (err: unknown) {
				logError(err, 'loadDashboard')
				const errorInfo = parseError(err)
				setError({ title: errorInfo.title, message: errorInfo.message, type: errorInfo.type })
			} finally {
				setLoading(false)
				setRefreshing(false)
				setSwitchingProfile(false)
			}
		},
		[fetchDashboardForProfile, resolveSelectedFromData]
	)

	useEffect(() => {
		loadDashboard()
	}, [loadDashboard])

	const onRefresh = useCallback(() => {
		setRefreshing(true)
		loadDashboard(selectedProfile ?? undefined)
	}, [loadDashboard, selectedProfile])

	const handleSelectProfile = useCallback(
		async (profile: DashboardProfile) => {
			if (!selectedProfile || profile._id === selectedProfile.profileId) return

			const next: SelectedProfile = {
				kind: profile.kind,
				slug: profile.slug,
				profileId: profile._id
			}

			try {
				setSwitchingProfile(true)
				setError(null)
				const data = await fetchDashboardForProfile(next)
				setDashboardData(data)
				setSelectedProfile(next)
			} catch (err: unknown) {
				logError(err, 'switchDashboardProfile')
				const errorInfo = parseError(err)
				setError({ title: errorInfo.title, message: errorInfo.message, type: errorInfo.type })
			} finally {
				setSwitchingProfile(false)
			}
		},
		[fetchDashboardForProfile, selectedProfile]
	)

	const getProfileLabel = (profile: DashboardProfile) => localize(profile.name)

	const getProfileThumbnail = (profile: DashboardProfile) => profile.media?.thumbnail?.url

	if (loading && !refreshing) {
		return (
			<View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	if (error && !dashboardData) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<ScreenHeader title={translate('dashboard', 'Dashboard')} showBack={false} onRefresh={onRefresh} isRefreshing={refreshing} />
				<ErrorState
					title={error.title}
					message={error.message}
					onRetry={() => {
						setLoading(true)
						loadDashboard()
					}}
					icon={error.type === 'network' || error.type === 'timeout' ? 'cloud-offline-outline' : 'alert-circle-outline'}
				/>
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScreenHeader
				title={translate('dashboard', 'Dashboard')}
				subtitle={user ? `${translate('dashboard.welcome', 'Welcome back')}, ${localize(user.name)}` : translate('dashboard.welcome', 'Welcome back')}
				showBack={false}
				onRefresh={onRefresh}
				isRefreshing={refreshing || switchingProfile}
			/>

			<ScrollView
				contentContainerStyle={styles.scrollContent}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
				showsVerticalScrollIndicator={false}
				onScroll={onScroll}
				scrollEventThrottle={16}
			>
				{showProfileSwitcher && (
					<View style={styles.section}>
						<Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{translate('dashboard.switch_profile', 'Switch profile')}</Text>
						<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.profileRow}>
							{profiles.map((profile) => {
								const active = selectedProfile?.profileId === profile._id
								const thumb = getProfileThumbnail(profile)
								return (
									<TouchableOpacity
										key={profile._id}
										activeOpacity={0.85}
										onPress={() => handleSelectProfile(profile)}
										style={[
											styles.profileChip,
											{
												backgroundColor: active ? colors.primaryContainer : colors.surface,
												borderColor: active ? colors.primary : colors.border
											}
										]}
									>
										{thumb ? (
											<SmartImage source={thumb} style={styles.profileAvatar} entityType="business" />
										) : (
											<View style={[styles.profileAvatar, styles.profileAvatarFallback, { backgroundColor: `${colors.primary}20` }]}>
												<MaterialIcons name={profile.kind === 'personal' ? 'person' : 'store'} size={20} color={colors.primary} />
											</View>
										)}
										<View style={styles.profileChipText}>
											<Text style={[styles.profileKind, { color: colors.textTertiary }]} numberOfLines={1}>
												{profile.kind === 'personal' ? translate('dashboard.personal', 'Personal') : translate('dashboard.business', 'Business')}
											</Text>
											<Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
												{getProfileLabel(profile)}
											</Text>
										</View>
										{active && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
									</TouchableOpacity>
								)
							})}
						</ScrollView>
					</View>
				)}

				{switchingProfile && (
					<View style={styles.switchingBanner}>
						<ActivityIndicator size="small" color={colors.primary} />
						<Text style={[styles.switchingText, { color: colors.textSecondary }]}>{translate('loading', 'Loading...')}</Text>
					</View>
				)}

				{dashboardData && isPersonalDashboard(dashboardData) && <PersonalDashboardContent data={dashboardData} styles={styles} colors={colors} router={router} />}

				{dashboardData && isBusinessDashboard(dashboardData) && <BusinessDashboardContent data={dashboardData} styles={styles} colors={colors} router={router} />}
			</ScrollView>
		</View>
	)
}

// --- Personal dashboard ---

type ContentProps = {
	data: DashboardData
	styles: ReturnType<typeof createStyles>
	colors: typeof import('../../core/theme').colors
	router: ReturnType<typeof useRouter>
}

const PersonalDashboardContent = ({ data, styles, colors, router }: ContentProps & { data: import('./dashboard.interface').PersonalDashboard }) => {
	const { localize, translate } = useUser()

	const exploreActions = useMemo(
		() => [
			{
				label: translate('dashboard.browse_businesses', 'Browse businesses'),
				icon: <MaterialIcons name="storefront" size={22} color={colors.primary} />,
				color: colors.primary,
				onPress: () => router.push('/(home)/businesses' as never)
			},
			{
				label: translate('dashboard.purchases', 'Purchases'),
				icon: <Feather name="package" size={22} color={colors.info} />,
				color: colors.info,
				onPress: () => router.push('/(home)/purchases' as never)
			},
			{
				label: translate('feed', 'Feed'),
				icon: <Feather name="tag" size={22} color={colors.success} />,
				color: colors.success,
				onPress: () => router.push('/(home)/feed' as never)
			},
			{
				label: translate('settings', 'Settings'),
				icon: <Feather name="settings" size={22} color={colors.textTertiary} />,
				color: colors.textTertiary,
				onPress: () => router.push('/(home)/settings' as never)
			}
		],
		[colors, router, translate]
	)

	return (
		<>
			<LinearGradient colors={[colors.primaryContainer, colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
				<View style={styles.heroInfo}>
					<View style={[styles.kindBadge, { backgroundColor: `${colors.secondary}25` }]}>
						<MaterialIcons name="person" size={14} color={colors.secondary} />
						<Text style={[styles.kindBadgeText, { color: colors.secondary }]}>{translate('dashboard.personal', 'Personal')}</Text>
					</View>
					<Text style={[styles.heroTitle, { color: colors.text }]}>{localize(data.user.name)}</Text>
					<Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>@{data.user.slug}</Text>
				</View>
				<View style={[styles.heroIconWrap, { backgroundColor: `${colors.primary}15` }]}>
					<MaterialIcons name="explore" size={32} color={colors.primary} />
				</View>
			</LinearGradient>

			<SectionTitle title={translate('dashboard.explore', 'Explore')} colors={colors} />
			<View style={styles.actionsGrid}>
				{exploreActions.map((action) => (
					<QuickAction key={action.label} {...action} styles={styles} colors={colors} />
				))}
			</View>

			<RankPairSection
				title={translate('dashboard.top_businesses', 'Top businesses')}
				leftTitle={translate('dashboard.top_businesses_new', 'New')}
				rightTitle={translate('dashboard.top_businesses_frequent', 'Frequent')}
				leftItems={data.topBusinesses.new}
				rightItems={data.topBusinesses.frequent}
				styles={styles}
				colors={colors}
				entityType="business"
				emptyHint={translate('dashboard.no_businesses_yet', 'No businesses to show yet')}
			/>
		</>
	)
}

// --- Business dashboard ---

const BusinessDashboardContent = ({ data, styles, colors, router }: ContentProps & { data: import('./dashboard.interface').BusinessDashboard }) => {
	const { localize, translate } = useUser()
	const business = data.business

	const managementActions = useMemo(
		() => [
			{
				label: translate('dashboard.management', 'Management'),
				icon: <MaterialIcons name="store" size={22} color={colors.primary} />,
				color: colors.primary,
				onPress: () => router.push('/(home)/business/my-businesses' as never)
			},
			{
				label: translate('my_products', 'My Products'),
				icon: <MaterialIcons name="inventory" size={22} color={colors.success} />,
				color: colors.success,
				onPress: () => router.push(`/(home)/businesses/${business.slug}/products` as never)
			},
			{
				label: translate('sales', 'Sales'),
				icon: <MaterialIcons name="receipt-long" size={22} color={colors.info} />,
				color: colors.info,
				onPress: () => router.push('/(home)/business/sales' as never)
			},
			{
				label: translate('create_product', 'Create Product'),
				icon: <MaterialIcons name="add-circle-outline" size={22} color={colors.warning} />,
				color: colors.warning,
				onPress: () =>
					Platform.OS === 'web'
						? router.push(`/(home)/businesses/${business.slug}/products/create` as never)
						: router.push({
								pathname: '/(home)/business/create-product',
								params: { businessSlug: business.slug, businessId: business._id }
							} as never)
			}
		],
		[business._id, business.slug, colors, router, translate]
	)

	const productStats: { key: keyof ProductStats; label: string; icon: React.ReactNode; accent: string }[] = [
		{
			key: 'count',
			label: translate('dashboard.products_total', 'Products'),
			icon: <MaterialIcons name="inventory-2" size={22} color={colors.primary} />,
			accent: colors.primary
		},
		{
			key: 'lowStock',
			label: translate('dashboard.low_stock', 'Low stock'),
			icon: <MaterialIcons name="warning-amber" size={22} color={colors.warning} />,
			accent: colors.warning
		},
		{
			key: 'outOfStock',
			label: translate('dashboard.out_of_stock', 'Out of stock'),
			icon: <MaterialIcons name="remove-shopping-cart" size={22} color={colors.error} />,
			accent: colors.error
		}
	]

	return (
		<>
			<LinearGradient colors={[colors.primaryContainer, colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
				<SmartImage source={business.media?.thumbnail?.url} style={styles.heroThumbnail} entityType="business" />
				<View style={styles.heroInfo}>
					<View style={[styles.kindBadge, { backgroundColor: `${colors.primary}25` }]}>
						<MaterialIcons name="store" size={14} color={colors.primary} />
						<Text style={[styles.kindBadgeText, { color: colors.primary }]}>{translate('dashboard.business', 'Business')}</Text>
					</View>
					<Text style={[styles.heroTitle, { color: colors.text }]}>{localize(business.name)}</Text>
					<Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>@{business.slug}</Text>
					{business.owner && (
						<Text style={[styles.heroMeta, { color: colors.textTertiary }]}>
							{translate('business_owner', 'Owner')}: {localize(business.owner.name)}
						</Text>
					)}
				</View>
			</LinearGradient>

			<SectionTitle title={translate('dashboard.inventory', 'Inventory')} colors={colors} />
			<View style={styles.statsRow}>
				{productStats.map((stat) => (
					<StatCard
						key={stat.key}
						title={stat.label}
						value={data.products[stat.key]}
						icon={stat.icon}
						accent={stat.accent}
						styles={styles}
						colors={colors}
						onPress={() => router.push('/(home)/business/my-products' as never)}
					/>
				))}
			</View>

			<SectionTitle title={translate('dashboard.management', 'Management')} colors={colors} />
			<View style={styles.actionsGrid}>
				{managementActions.map((action) => (
					<QuickAction key={action.label} {...action} styles={styles} colors={colors} />
				))}
			</View>

			<SectionTitle title={translate('dashboard.insights', 'Insights')} colors={colors} />

			<RankPairSection
				title={translate('dashboard.top_products', 'Top products')}
				leftTitle={translate('dashboard.top_selling', 'Best selling')}
				rightTitle={translate('dashboard.top_viewed', 'Most viewed')}
				leftItems={data.topProducts.selling}
				rightItems={data.topProducts.viewed}
				styles={styles}
				colors={colors}
				entityType="product"
				emptyHint={translate('dashboard.no_products_yet', 'No product data yet')}
			/>

			<RankPairSection
				title={translate('dashboard.top_customers', 'Top customers')}
				leftTitle={translate('dashboard.top_customers_frequent', 'Frequent')}
				rightTitle={translate('dashboard.top_customers_new', 'New')}
				leftItems={data.topCustomers.frequent}
				rightItems={data.topCustomers.new}
				styles={styles}
				colors={colors}
				entityType="user"
				emptyHint={translate('dashboard.no_customers_yet', 'No customer data yet')}
			/>
		</>
	)
}

// --- Shared UI pieces ---

const SectionTitle = ({ title, colors }: { title: string; colors: typeof import('../../core/theme').colors }) => (
	<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 10 }}>
		<View style={{ width: 4, height: 22, borderRadius: 2, backgroundColor: colors.primary }} />
		<Text style={{ fontSize: 19, fontWeight: '800', color: colors.text, letterSpacing: -0.5, flex: 1 }}>{title}</Text>
	</View>
)

type StatCardProps = {
	title: string
	value: number
	icon: React.ReactNode
	accent: string
	styles: ReturnType<typeof createStyles>
	colors: typeof import('../../core/theme').colors
	onPress?: () => void
}

const StatCard = ({ title, value, icon, accent, styles, colors, onPress }: StatCardProps) => (
	<TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.statCard, { borderColor: `${accent}40`, backgroundColor: colors.card }]}>
		<LinearGradient colors={[`${accent}15`, `${accent}05`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
		<View style={[styles.statIcon, { backgroundColor: `${accent}20` }]}>{icon}</View>
		<Text style={[styles.statValue, { color: accent }]}>{value}</Text>
		<Text style={[styles.statLabel, { color: colors.textSecondary }]}>{title}</Text>
	</TouchableOpacity>
)

type QuickActionProps = {
	label: string
	icon: React.ReactNode
	color: string
	onPress: () => void
	styles: ReturnType<typeof createStyles>
	colors: typeof import('../../core/theme').colors
}

const QuickAction = ({ label, icon, color, onPress, styles, colors }: QuickActionProps) => (
	<TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[styles.quickAction, { backgroundColor: colors.surface, borderColor: `${color}20` }]}>
		<View style={[styles.quickActionIcon, { backgroundColor: `${color}15` }]}>{icon}</View>
		<Text style={[styles.quickActionLabel, { color: colors.text }]} numberOfLines={2}>
			{label}
		</Text>
	</TouchableOpacity>
)

type RankPairSectionProps = {
	title: string
	leftTitle: string
	rightTitle: string
	leftItems: DashboardRankItem[]
	rightItems: DashboardRankItem[]
	styles: ReturnType<typeof createStyles>
	colors: typeof import('../../core/theme').colors
	entityType: 'business' | 'product' | 'user'
	emptyHint: string
}

const RankPairSection = ({ title, leftTitle, rightTitle, leftItems, rightItems, styles, colors, entityType, emptyHint }: RankPairSectionProps) => {
	const { localize } = useUser()

	const renderList = (items: DashboardRankItem[], listTitle: string) => (
		<View style={[styles.rankPanel, { backgroundColor: colors.card, borderColor: colors.info || '#3B82F6' }]}>
			<Text style={[styles.rankPanelTitle, { color: colors.text }]}>{listTitle}</Text>
			{items.length === 0 ? (
				<Text style={[styles.rankEmpty, { color: colors.textTertiary }]}>{emptyHint}</Text>
			) : (
				items
					.slice(0, 5)
					.map((item, index) => (
						<RankRow
							key={item._id || `${listTitle}-${index}`}
							item={item}
							index={index}
							localize={localize}
							styles={styles}
							colors={colors}
							entityType={entityType}
							isLast={index === Math.min(items.length, 5) - 1}
						/>
					))
			)}
		</View>
	)

	return (
		<View style={styles.section}>
			<Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{title}</Text>
			<View style={styles.rankPairRow}>
				{renderList(leftItems, leftTitle)}
				{renderList(rightItems, rightTitle)}
			</View>
		</View>
	)
}

type RankRowProps = {
	item: DashboardRankItem
	localize: (name?: LocalizedName) => string
	styles: ReturnType<typeof createStyles>
	colors: typeof import('../../core/theme').colors
	entityType: 'business' | 'product' | 'user'
	isLast: boolean
}

const RankRow = ({ item, localize, styles, colors, entityType, isLast, index }: RankRowProps & { index?: number }) => {
	const label = item.name ? localize(item.name) : item.slug || '—'
	const metric = item.count ?? item.views
	const medal = index !== undefined && index < 3 ? MEDALS[index] : undefined

	return (
		<View style={[styles.rankRow, { borderColor: `${colors.border}60` }, isLast && { borderBottomWidth: 0 }]}>
			{medal ? <Text style={{ fontSize: 16, marginRight: -2 }}>{medal}</Text> : null}
			<SmartImage source={item.media?.thumbnail?.url} style={styles.rankAvatar} entityType={entityType} />
			<Text style={[styles.rankName, { color: colors.text }]} numberOfLines={1}>
				{label}
			</Text>
			{metric !== undefined && (
				<View style={[styles.rankMetric, { backgroundColor: `${colors.primary}15` }]}>
					<Text style={[styles.rankMetricText, { color: colors.primary }]}>{metric}</Text>
				</View>
			)}
		</View>
	)
}

const createStyles = (colors: typeof import('../../core/theme').colors) =>
	StyleSheet.create({
		container: { flex: 1 },
		centered: { justifyContent: 'center', alignItems: 'center' },
		scrollContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12, gap: 6 },
		section: { marginBottom: 24 },
		sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 },
		profileRow: { gap: 10, paddingRight: 8 },
		profileChip: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingVertical: 12,
			paddingHorizontal: 14,
			borderRadius: 20,
			borderWidth: 1.5,
			gap: 12,
			maxWidth: width * 0.72,
			position: 'relative',
			...Platform.select({
				web: { backdropFilter: 'blur(12px)', transition: 'all 0.2s ease' } as any,
				ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
				android: { elevation: 3 }
			})
		},
		profileAvatar: { width: 44, height: 44, borderRadius: 14 },
		profileAvatarFallback: { justifyContent: 'center', alignItems: 'center' },
		profileChipText: { flex: 1, minWidth: 0 },
		profileKind: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
		profileName: { fontSize: 15, fontWeight: '700', marginTop: 3, letterSpacing: -0.2 },
		activeDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4 },
		switchingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, marginBottom: 4, borderRadius: 12, backgroundColor: `${colors.primary}08` },
		switchingText: { fontSize: 13, fontWeight: '500' },
		heroCard: {
			borderRadius: 28,
			padding: 24,
			flexDirection: 'row',
			alignItems: 'center',
			gap: 18,
			borderWidth: 1,
			borderColor: `${colors.primary}15`,
			marginBottom: 12,
			...Platform.select({
				web: { backdropFilter: 'blur(20px)', boxShadow: `0 8px 32px ${colors.primary}12` } as any,
				ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20 },
				android: { elevation: 6 }
			})
		},
		heroThumbnail: { width: 80, height: 80, borderRadius: 22, borderWidth: 2, borderColor: `${colors.primary}30` },
		heroInfo: { flex: 1 },
		heroIconWrap: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
		kindBadge: {
			flexDirection: 'row',
			alignItems: 'center',
			alignSelf: 'flex-start',
			gap: 5,
			paddingHorizontal: 10,
			paddingVertical: 5,
			borderRadius: 10,
			marginBottom: 10
		},
		kindBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
		heroTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.6 },
		heroSubtitle: { fontSize: 14, fontWeight: '500', marginTop: 4, letterSpacing: 0.2 },
		heroMeta: { fontSize: 12, marginTop: 8, fontWeight: '500' },
		statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
		statCard: {
			flex: 1,
			minWidth: 100,
			borderRadius: 22,
			padding: 18,
			borderWidth: 1.5,
			overflow: 'hidden',
			...Platform.select({
				web: { backdropFilter: 'blur(12px)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', transition: 'transform 0.2s ease, box-shadow 0.2s ease' } as any,
				ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12 },
				android: { elevation: 4 }
			})
		},
		statIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
		statValue: { fontSize: 30, fontWeight: '800', letterSpacing: -1.5 },
		statLabel: { fontSize: 11, fontWeight: '700', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
		actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
		quickAction: {
			width: (width - 42) / 2,
			borderRadius: 22,
			borderWidth: 1,
			padding: 18,
			alignItems: 'center',
			gap: 12,
			...Platform.select({
				web: { backdropFilter: 'blur(8px)', transition: 'transform 0.15s ease, box-shadow 0.15s ease', cursor: 'pointer' } as any,
				ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 6 },
				android: { elevation: 2 }
			})
		},
		quickActionIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
		quickActionLabel: { fontSize: 13, fontWeight: '700', textAlign: 'center', letterSpacing: -0.2 },
		rankPairRow: { flexDirection: 'row', gap: 10 },
		rankPanel: {
			flex: 1,
			borderRadius: 22,
			borderWidth: 1,
			padding: 16,
			minHeight: 140,
			...Platform.select({
				web: { backdropFilter: 'blur(8px)' } as any,
				ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
				android: { elevation: 2 }
			})
		},
		rankPanelTitle: { fontSize: 14, fontWeight: '800', marginBottom: 12, letterSpacing: -0.2 },
		rankEmpty: { fontSize: 12, lineHeight: 20, paddingVertical: 10, fontStyle: 'italic' },
		rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
		rankAvatar: { width: 36, height: 36, borderRadius: 10 },
		rankName: { flex: 1, fontSize: 13, fontWeight: '600', letterSpacing: -0.1 },
		rankMetric: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
		rankMetricText: { fontSize: 11, fontWeight: '800' }
	})

export default Dashboard
