import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter, Tabs, Stack } from 'expo-router'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { ThemeColors, useTheme } from '@/core/theme'
import { HeaderCreateProductButton, HeaderQRCodeButton, HeaderRefreshButton, HeaderSalesButton, SmartHeader } from '@/core/smart-header'
import Spinner from '@/features/common/Spinner'
import ErrorState from '@/features/common/ErrorState'
import { useUser } from '@/core/contexts/UserContext'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import { SmartMediaView } from '@/core/smart-media'
import { BaseCard } from '@/features/common/cards/BaseCard'
import { IconButton } from '@/features/common/buttons/IconButton'
import { log } from '@/core/log'
import { config } from '@/config'
import QRCodeModal from '@/features/common/QRCodeModal'
import { useBusinessDashboard } from './useBusinessDashboard'
import { getBusinessCustomers } from '@/features/businesses/businesses.api'
import { isBusinessDashboard, BusinessDashboard, DashboardRankItem, ProductStats } from './dashboard.interface'
import { LocalizedName } from '@/features/businesses/businesses.interface'

const MEDALS = ['🥇', '🥈', '🥉']

type BusinessDashboardScreenProps = {
	businessSlug: string
}

const BusinessDashboardScreen = ({ businessSlug }: BusinessDashboardScreenProps) => {
	const { colors } = useTheme()
	const styles = useMemo(() => createStyles(colors), [colors])
	const { localize, translate, user } = useUser()
	const router = useRouter()
	const { onScroll } = useScrollHandler()
	const insets = useSafeAreaInsets()

	const [showQRCode, setShowQRCode] = useState(false)

	const { data: dashboardResponse, isInitialLoading, isRefreshing, isOffline, refresh } = useBusinessDashboard({ businessSlug })
	const dashboardData = dashboardResponse?.data ?? null

	const onRefresh = useCallback(() => {
		refresh()
	}, [refresh])

	const headerActions = useMemo(() => {
		const actions = [
			<HeaderSalesButton key="sales" businessSlug={businessSlug} label={translate('sales', 'Sales')} />,
			<HeaderCreateProductButton key="create-product" businessSlug={businessSlug} label={translate('create_product', 'Create Product')} />
		]
		if (dashboardData && isBusinessDashboard(dashboardData)) {
			actions.push(<HeaderQRCodeButton key="qr-code" onPress={() => setShowQRCode(true)} />)
		}
		actions.push(<HeaderRefreshButton key="refresh" onRefresh={onRefresh} isRefreshing={isRefreshing} />)
		return actions
	}, [businessSlug, dashboardData, isRefreshing, onRefresh, translate])

	if (isInitialLoading) {
		return <Spinner />
	}

	if (isOffline && !dashboardData) {
		return (
			<View style={styles.container}>
				<Tabs.Screen options={{ title: translate('dashboard', 'Dashboard'), headerLeft: () => null, headerActions: headerActions } as any} />
				<ErrorState />
			</View>
		)
	}

	if (!dashboardData || !isBusinessDashboard(dashboardData)) {
		return (
			<View style={styles.container}>
				<Tabs.Screen options={{ title: translate('dashboard', 'Dashboard'), headerLeft: () => null, headerActions: headerActions } as any} />
				<ErrorState />
			</View>
		)
	}

	const business = dashboardData.business

	return (
		<View style={styles.container}>
			<Tabs.Screen
				options={
					{
						title: localize(business.name),
						subtitle: business.slug,
						headerLeft: () => null,
						headerActions: headerActions
					} as any
				}
			/>
			<Stack.Screen options={{ headerActions: headerActions } as any} />

			<SmartHeader.ScrollView
				contentContainerStyle={[styles.scrollContent, { paddingBottom: 90 + insets.bottom }]}
				refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
				showsVerticalScrollIndicator={false}
				onScroll={onScroll}
				scrollEventThrottle={16}
			>
				<BusinessDashboardContent data={dashboardData} styles={styles} colors={colors} router={router} />
			</SmartHeader.ScrollView>

			{user && (
				<QRCodeModal
					visible={showQRCode}
					onClose={() => setShowQRCode(false)}
					value={`${config.frontend.url}/b/${business.slug}`}
					title={localize(business.name)}
					subtitle={business.slug}
					filenamePrefix={`business_${business.slug}`}
				/>
			)}
		</View>
	)
}

// --- Business dashboard content ---

type ContentProps = {
	data: BusinessDashboard
	styles: ReturnType<typeof createStyles>
	colors: ThemeColors
	router: ReturnType<typeof useRouter>
}

const BusinessDashboardContent = ({ data, styles, colors, router }: ContentProps) => {
	const { localize, translate } = useUser()
	const business = data.business

	const [customers, setCustomers] = useState<import('../businesses/businesses.interface').BusinessCustomerDoc[]>([])
	const [loadingCustomers, setLoadingCustomers] = useState(true)

	useEffect(() => {
		const fetchCustomers = async () => {
			try {
				setLoadingCustomers(true)
				const res = await getBusinessCustomers(business.slug)
				setCustomers(res.data?.docs || [])
			} catch (err) {
				log({ level: 'error', label: 'BusinessDashboard', message: 'Failed to load business customers', error: err })
			} finally {
				setLoadingCustomers(false)
			}
		}
		if (business.slug) {
			fetchCustomers()
		}
	}, [business.slug])

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
			<HeroCard business={business} styles={styles} colors={colors} />

			<SectionTitle title={translate('dashboard.inventory', 'Inventory')} colors={colors} />
			<BaseCard size="md" style={styles.statsCard}>
				<View style={styles.statsRow}>
					{productStats.map((stat) => (
						<StatBlock
							key={stat.key}
							title={stat.label}
							value={data.products[stat.key]}
							icon={stat.icon}
							accent={stat.accent}
							styles={styles}
							onPress={() => router.push(`/dashboard/${business.slug}/products` as never)}
						/>
					))}
				</View>
			</BaseCard>

			<SectionTitle title={translate('dashboard.customers', 'Customers')} colors={colors} />
			<BaseCard size="md" style={styles.customersCard}>
				{loadingCustomers ? (
					<Spinner size="small" expand={false} />
				) : customers.length === 0 ? (
					<View style={[styles.centered, { paddingVertical: 20 }]}>
						<Ionicons name="people-outline" size={32} color={colors.textTertiary} style={{ opacity: 0.5, marginBottom: 8 }} />
						<Text style={{ color: colors.textSecondary, fontSize: 13 }}>{translate('dashboard.no_customers', 'No customers found yet.')}</Text>
					</View>
				) : (
					<ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === 'web'} contentContainerStyle={styles.customersRow}>
						{customers.map((doc) => {
							const customer = doc.customer
							const thumb = customer.media?.thumbnail?.url
							return (
								<TouchableOpacity
									key={doc._id}
									activeOpacity={0.85}
									onPress={() => router.push(`/dashboard/${business.slug}/sales?customerSlug=${customer.slug}` as never)}
									style={[styles.customerChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
								>
									<SmartMediaView media={thumb} style={styles.customerAvatar} />
									<View style={styles.customerChipText}>
										<Text style={[styles.customerNameText, { color: colors.text }]} numberOfLines={2}>
											{localize(customer.name)}
										</Text>
										<Text style={[styles.customerSlugText, { color: colors.textSecondary }]} numberOfLines={2}>
											{customer.slug}
										</Text>
										{customer.address?.city && (
											<Text style={[styles.customerCityText, { color: colors.textTertiary }]} numberOfLines={1}>
												{customer.address.city}
											</Text>
										)}
									</View>
								</TouchableOpacity>
							)
						})}
					</ScrollView>
				)}
			</BaseCard>

			<SectionTitle title={translate('dashboard.insights', 'Insights')} colors={colors} />

			<RankPairSection
				title={translate('dashboard.top_products', 'Top products')}
				leftTitle={translate('dashboard.top_selling', 'Best selling')}
				rightTitle={translate('dashboard.top_viewed', 'Most viewed')}
				leftItems={data.topProducts.selling}
				rightItems={data.topProducts.viewed}
				styles={styles}
				colors={colors}
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
				emptyHint={translate('dashboard.no_customers_yet', 'No customer data yet')}
			/>
		</>
	)
}

// --- Hero ---

const HeroCard = ({ business, styles, colors }: { business: BusinessDashboard['business']; styles: ReturnType<typeof createStyles>; colors: ThemeColors }) => {
	const { localize, translate } = useUser()
	const router = useRouter()
	const city = business.address?.city || business.address?.region
	const phone = business.contact?.phone?.fullNumber || business.contact?.whatsapp

	return (
		<LinearGradient colors={[colors.primaryContainer, colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.heroCard, { borderColor: `${colors.primary}15` }]}>
			<View style={styles.heroTopRow}>
				<SmartMediaView media={business.media?.thumbnail?.url} style={styles.heroThumbnail} resizeMode="cover" />
				<View style={styles.heroInfo}>
					<View style={[styles.kindBadge, { backgroundColor: `${colors.primary}25` }]}>
						<MaterialIcons name="store" size={12} color={colors.primary} />
						<Text style={[styles.kindBadgeText, { color: colors.primary }]}>{translate('dashboard.business', 'Business')}</Text>
					</View>
					<Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={2}>
						{localize(business.name)}
					</Text>
					<Text style={[styles.heroSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
						@{business.slug}
					</Text>
				</View>
				<IconButton
					icon="edit"
					iconType="material"
					label={translate('edit_business', 'Edit Business')}
					onPress={() => router.push(`/dashboard/${business.slug}/edit` as never)}
					size={38}
					variant="secondary"
					outline
					style={styles.heroEditButton}
				/>
			</View>

			{business.owner && (
				<View style={[styles.heroRow, { borderTopColor: `${colors.border}60`, borderTopWidth: StyleSheet.hairlineWidth }]}>
					<Ionicons name="person-circle-outline" size={16} color={colors.textTertiary} />
					<Text style={[styles.heroRowText, { color: colors.textTertiary }]} numberOfLines={1}>
						{translate('business_owner', 'Owner')}: {localize(business.owner.name)}
					</Text>
				</View>
			)}
			{city && (
				<View style={styles.heroRow}>
					<Ionicons name="location-outline" size={16} color={colors.textTertiary} />
					<Text style={[styles.heroRowText, { color: colors.textTertiary }]} numberOfLines={1}>
						{city}
					</Text>
				</View>
			)}
			{phone && (
				<View style={styles.heroRow}>
					<Ionicons name="call-outline" size={16} color={colors.textTertiary} />
					<Text style={[styles.heroRowText, { color: colors.textTertiary }]} numberOfLines={1}>
						{phone}
					</Text>
				</View>
			)}
		</LinearGradient>
	)
}

// --- Sections ---

const SectionTitle = ({ title, colors }: { title: string; colors: ThemeColors }) => (
	<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 10 }}>
		<View style={{ width: 4, height: 22, borderRadius: 2, backgroundColor: colors.primary }} />
		<Text style={{ fontSize: 19, fontWeight: '800', color: colors.text, letterSpacing: -0.5, flex: 1 }}>{title}</Text>
	</View>
)

type StatBlockProps = {
	title: string
	value: number
	icon: React.ReactNode
	accent: string
	styles: ReturnType<typeof createStyles>
	onPress?: () => void
}

const StatBlock = ({ title, value, icon, accent, styles, onPress }: StatBlockProps) => {
	const { colors } = useTheme()
	return (
		<TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.statBlock, { borderColor: `${accent}30` }]} accessibilityRole="button">
			<View style={[styles.statIcon, { backgroundColor: `${accent}18` }]}>{icon}</View>
			<Text style={[styles.statValue, { color: accent }]}>{value}</Text>
			<Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>
				{title}
			</Text>
		</TouchableOpacity>
	)
}

// --- Insights ---

type RankPairSectionProps = {
	title: string
	leftTitle: string
	rightTitle: string
	leftItems: DashboardRankItem[]
	rightItems: DashboardRankItem[]
	styles: ReturnType<typeof createStyles>
	colors: ThemeColors
	emptyHint: string
}

const RankPairSection = ({ title, leftTitle, rightTitle, leftItems, rightItems, styles, colors, emptyHint }: RankPairSectionProps) => {
	const { localize } = useUser()

	const renderList = (items: DashboardRankItem[], listTitle: string) => (
		<BaseCard size="md" style={styles.rankPanel}>
			<Text style={[styles.rankPanelTitle, { color: colors.text }]}>{listTitle}</Text>
			{items.length === 0 ? (
				<Text style={[styles.rankEmpty, { color: colors.textTertiary }]}>{emptyHint}</Text>
			) : (
				items
					.slice(0, 5)
					.map((item, index) => (
						<RankRow key={item._id || `${listTitle}-${index}`} item={item} index={index} localize={localize} styles={styles} colors={colors} isLast={index === Math.min(items.length, 5) - 1} />
					))
			)}
		</BaseCard>
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
	colors: ThemeColors
	isLast: boolean
}

const RankRow = ({ item, localize, styles, colors, isLast, index }: RankRowProps & { index?: number }) => {
	const label = item.name ? localize(item.name) : item.slug || '—'
	const metric = item.count ?? item.views
	const medal = index !== undefined && index < 3 ? MEDALS[index] : undefined

	return (
		<View style={[styles.rankRow, { borderColor: `${colors.border}60` }, isLast && { borderBottomWidth: 0 }]}>
			{medal ? <Text style={{ fontSize: 16, marginRight: -2 }}>{medal}</Text> : null}
			<SmartMediaView media={item.media?.thumbnail?.url} style={styles.rankAvatar} />
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

const createStyles = (colors: ThemeColors) =>
	StyleSheet.create({
		container: { flex: 1, backgroundColor: colors.background },
		centered: { justifyContent: 'center', alignItems: 'center' },
		scrollContent: { paddingHorizontal: 16, paddingBottom: 90, paddingTop: 12, gap: 6 },
		section: { marginBottom: 24 },
		sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 },
		heroCard: {
			borderRadius: 28,
			padding: 22,
			borderWidth: 1,
			marginBottom: 12,
			gap: 10
		},
		heroTopRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 16
		},
		heroThumbnail: { width: 84, height: 84, borderRadius: 24, borderWidth: 2, borderColor: `${colors.primary}30` },
		heroInfo: { flex: 1, minWidth: 0 },
		heroEditButton: { marginLeft: 4, alignSelf: 'flex-start', backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` },
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
		heroRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8,
			paddingTop: 10,
			borderTopWidth: 0
		},
		heroRowText: { fontSize: 13, fontWeight: '500', flex: 1 },
		statsCard: { marginBottom: 12 },
		statsRow: { flexDirection: 'row', gap: 10 },
		statBlock: {
			flex: 1,
			minWidth: 0,
			borderRadius: 16,
			borderWidth: 1.5,
			padding: 14,
			alignItems: 'flex-start',
			backgroundColor: colors.surface
		},
		statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
		statValue: { fontSize: 26, fontWeight: '800', letterSpacing: -1.2 },
		statLabel: { fontSize: 10, fontWeight: '700', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
		customersCard: { marginBottom: 12 },
		customersRow: { gap: 12, paddingRight: 4 },
		customerChip: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingVertical: 10,
			paddingHorizontal: 12,
			borderRadius: 16,
			borderWidth: 1,
			gap: 10,
			width: 200
		},
		customerAvatar: { width: 40, height: 40, borderRadius: 20 },
		customerChipText: { flex: 1, minWidth: 0 },
		customerNameText: { fontSize: 13, fontWeight: '700' },
		customerSlugText: { fontSize: 11, fontWeight: '500', marginTop: 1 },
		customerCityText: { fontSize: 10, fontWeight: '500', marginTop: 2 },
		rankPairRow: { flexDirection: 'row', gap: 12 },
		rankPanel: { flex: 1, minWidth: 0, minHeight: 150 },
		rankPanelTitle: { fontSize: 14, fontWeight: '800', marginBottom: 12, letterSpacing: -0.2 },
		rankEmpty: { fontSize: 12, lineHeight: 20, paddingVertical: 10, fontStyle: 'italic' },
		rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
		rankAvatar: { width: 36, height: 36, borderRadius: 10 },
		rankName: { flex: 1, fontSize: 13, fontWeight: '600', letterSpacing: -0.1 },
		rankMetric: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
		rankMetricText: { fontSize: 11, fontWeight: '800' }
	})

export default BusinessDashboardScreen
