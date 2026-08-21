import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, ThemeColors } from '@/core/theme'
import ErrorBlock from '@/core/error/ErrorBlock'
import { useUser } from '@/core/contexts/UserContext'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import { HeaderRefreshButton, SmartHeader } from '@/core/smart-header'
import { FilterTabs, FilterTabOption } from '@/features/common/FilterTabs'
import { BaseCard } from '@/features/common/cards/BaseCard'
import { SmartMediaView } from '@/core/smart-media'
import Spinner from '@/features/common/Spinner'
import { useDashboardProfiles } from './useDashboardProfiles'
import { DashboardProfile, isBusinessDashboard, sortDashboardProfiles, ProductStats } from './dashboard.interface'

const PERSONAL_TAB = 'personal'

const Dashboard = () => {
	const { colors } = useTheme()
	const { localize, translate, user } = useUser()
	const router = useRouter()
	const insets = useSafeAreaInsets()
	const { onScroll } = useScrollHandler()
	const styles = useMemo(() => createStyles(colors), [colors])

	const { data: profilesResponse, isInitialLoading, isRefreshing, isOffline, refresh: refreshProfiles } = useDashboardProfiles()

	const profiles = useMemo(() => sortDashboardProfiles(profilesResponse?.data || [], localize), [profilesResponse, localize])
	const personalProfile = useMemo(() => profiles.find((p) => p.kind === 'personal') || null, [profiles])
	const businessProfiles = useMemo(() => profiles.filter((p): p is Extract<DashboardProfile, { kind: 'business' }> => isBusinessDashboard(p)), [profiles])

	const tabOptions = useMemo<FilterTabOption[]>(() => {
		const options: FilterTabOption[] = []
		if (personalProfile) {
			options.push({ value: PERSONAL_TAB, label: localize(personalProfile.user.name) || translate('dashboard.personal', 'Personal'), iconName: 'person-outline' })
		}
		businessProfiles.forEach((profile) => {
			options.push({ value: `business:${profile._id}`, label: localize(profile.business.name), iconName: 'storefront-outline' })
		})
		return options
	}, [personalProfile, businessProfiles, localize, translate])

	const defaultTab = useMemo(() => {
		if (personalProfile) return PERSONAL_TAB
		if (businessProfiles.length > 0) return `business:${businessProfiles[0]._id}`
		return ''
	}, [personalProfile, businessProfiles])

	const [selectedTab, setSelectedTab] = useState<string>('')

	useEffect(() => {
		setSelectedTab((prev) => {
			const stillValid = prev === PERSONAL_TAB ? !!personalProfile : businessProfiles.some((p) => `business:${p._id}` === prev)
			return stillValid ? prev : defaultTab
		})
	}, [defaultTab, personalProfile, businessProfiles])

	const counts = useMemo(() => {
		const map: Record<string, number> = {}
		businessProfiles.forEach((profile) => {
			map[`business:${profile._id}`] = profile.products?.count ?? 0
		})
		return map
	}, [businessProfiles])

	const selectedProfile = useMemo(() => {
		if (selectedTab === PERSONAL_TAB) return personalProfile
		return businessProfiles.find((p) => `business:${p._id}` === selectedTab) || null
	}, [selectedTab, personalProfile, businessProfiles])

	const headerActions = useMemo(
		() => [
			<HeaderRefreshButton
				key="refresh"
				onRefresh={() => {
					refreshProfiles()
				}}
				isRefreshing={isRefreshing}
				isOffline={isOffline}
			/>
		],
		[refreshProfiles, isRefreshing, isOffline]
	)

	const handlePressProfile = (profile: DashboardProfile) => {
		if (profile.kind === 'personal') {
			router.push('/dashboard/personal/')
		} else if (profile.business?.slug) {
			router.push(`/dashboard/${profile.business.slug}/`)
		}
	}

	if (isInitialLoading) {
		return <Spinner />
	}

	if (isOffline && profiles.length === 0) {
		return (
			<View style={styles.container}>
				<Tabs.Screen options={{ title: translate('error', 'Error'), headerLeft: () => null, headerActions: headerActions } as any} />
				<ErrorBlock />
			</View>
		)
	}

	return (
		<View style={styles.container}>
			<Tabs.Screen
				options={
					{
						title: translate('dashboard', 'Dashboard'),
						subtitle: user ? `${translate('dashboard.welcome', 'Welcome back')}, ${localize(user.name)}` : translate('dashboard.welcome', 'Welcome back'),
						headerLeft: () => null,
						headerActions: headerActions,
						headerBottom: <FilterTabs value={selectedTab} options={tabOptions} onChange={setSelectedTab} counts={counts} loading={isRefreshing || isInitialLoading} resetKey="dashboard-profiles" />,
						headerBottomHeight: 48
					} as any
				}
			/>

			<SmartHeader.ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
				{profiles.length === 0 ? (
					<View style={styles.emptyWrap}>
						<View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}15` }]}>
							<Ionicons name="albums-outline" size={40} color={colors.textTertiary} />
						</View>
						<Text style={[styles.emptyText, { color: colors.textSecondary }]}>{translate('dashboard.no_profiles', 'No dashboard profiles found.')}</Text>
					</View>
				) : !selectedProfile ? null : selectedProfile.kind === 'personal' ? (
					<PersonalProfileCard profile={selectedProfile} colors={colors} styles={styles} onPress={() => handlePressProfile(selectedProfile)} />
				) : (
					<BusinessProfileCard profile={selectedProfile} colors={colors} styles={styles} onPress={() => handlePressProfile(selectedProfile)} />
				)}
			</SmartHeader.ScrollView>
		</View>
	)
}

// --- Profile cards (based on BaseCard) ---

const PersonalProfileCard = ({
	profile,
	colors,
	styles,
	onPress
}: {
	profile: Extract<DashboardProfile, { kind: 'personal' }>
	colors: ThemeColors
	styles: ReturnType<typeof createStyles>
	onPress: () => void
}) => {
	const { localize, translate } = useUser()
	const user = profile.user

	return (
		<BaseCard onPress={onPress} activeOpacity={0.85} style={styles.card}>
			<View style={styles.cardHeader}>
				<View style={styles.cardHeaderLeft}>
					<View style={[styles.cardAvatar, styles.cardAvatarFallback, { backgroundColor: `${colors.primary}15` }]}>
						<Ionicons name="person-outline" size={26} color={colors.primary} />
					</View>
					<View style={styles.cardHeaderText}>
						<Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
							{localize(user.name)}
						</Text>
						<Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
							@{user.slug}
						</Text>
					</View>
				</View>
				<View style={[styles.kindBadge, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
					<Ionicons name="person-outline" size={12} color={colors.primary} />
					<Text style={[styles.kindBadgeText, { color: colors.primary }]}>{translate('dashboard.personal', 'Personal')}</Text>
				</View>
			</View>

			<View style={styles.statsRow}>
				<StatPill
					icon="storefront-outline"
					label={translate('dashboard.top_businesses_frequent', 'Frequent')}
					value={profile.topBusinesses?.frequent?.length ?? 0}
					accent={colors.info}
					colors={colors}
					styles={styles}
				/>
				<StatPill
					icon="sparkles-outline"
					label={translate('dashboard.top_businesses_new', 'New')}
					value={profile.topBusinesses?.new?.length ?? 0}
					accent={colors.success}
					colors={colors}
					styles={styles}
				/>
			</View>

			<View style={styles.cardFooter}>
				<Text style={[styles.cardCta, { color: colors.primary }]}>{translate('dashboard.open_personal', 'Open personal dashboard')}</Text>
				<Ionicons name="chevron-forward" size={16} color={colors.primary} />
			</View>
		</BaseCard>
	)
}

const BusinessProfileCard = ({
	profile,
	colors,
	styles,
	onPress
}: {
	profile: Extract<DashboardProfile, { kind: 'business' }>
	colors: ThemeColors
	styles: ReturnType<typeof createStyles>
	onPress: () => void
}) => {
	const { localize, translate } = useUser()
	const business = profile.business
	const stats: { key: keyof ProductStats; label: string; icon: keyof typeof Ionicons.glyphMap; accent: string }[] = [
		{ key: 'count', label: translate('dashboard.products_total', 'Products'), icon: 'cube-outline', accent: colors.primary },
		{ key: 'lowStock', label: translate('dashboard.low_stock', 'Low stock'), icon: 'warning-outline', accent: colors.warning },
		{ key: 'outOfStock', label: translate('dashboard.out_of_stock', 'Out of stock'), icon: 'remove-circle-outline', accent: colors.error }
	]
	const city = business.address?.city || business.address?.region

	return (
		<BaseCard onPress={onPress} activeOpacity={0.85} style={styles.card}>
			<View style={styles.cardHeader}>
				<View style={styles.cardHeaderLeft}>
					<SmartMediaView media={business.media?.thumbnail?.url} style={styles.cardAvatar} resizeMode="cover" />
					<View style={styles.cardHeaderText}>
						<Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
							{localize(business.name)}
						</Text>
						<Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
							@{business.slug}
						</Text>
					</View>
				</View>
				<View style={[styles.kindBadge, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
					<Ionicons name="storefront-outline" size={12} color={colors.primary} />
					<Text style={[styles.kindBadgeText, { color: colors.primary }]}>{translate('dashboard.business', 'Business')}</Text>
				</View>
			</View>

			{city ? (
				<View style={styles.cardMetaRow}>
					<Ionicons name="location-outline" size={14} color={colors.textTertiary} />
					<Text style={[styles.cardMetaText, { color: colors.textTertiary }]} numberOfLines={1}>
						{city}
					</Text>
				</View>
			) : null}

			<View style={styles.statsRow}>
				{stats.map((stat) => (
					<StatPill key={stat.key} icon={stat.icon} label={stat.label} value={profile.products?.[stat.key] ?? 0} accent={stat.accent} colors={colors} styles={styles} />
				))}
			</View>

			<View style={styles.cardFooter}>
				<Text style={[styles.cardCta, { color: colors.primary }]}>{translate('dashboard.open_business', 'Open business dashboard')}</Text>
				<Ionicons name="chevron-forward" size={16} color={colors.primary} />
			</View>
		</BaseCard>
	)
}

const StatPill = ({
	icon,
	label,
	value,
	accent,
	colors,
	styles
}: {
	icon: keyof typeof Ionicons.glyphMap
	label: string
	value: number
	accent: string
	colors: ThemeColors
	styles: ReturnType<typeof createStyles>
}) => (
	<View style={[styles.statPill, { backgroundColor: `${accent}12`, borderColor: `${accent}25` }]}>
		<Ionicons name={icon} size={14} color={accent} />
		<Text style={[styles.statPillValue, { color: accent }]}>{value}</Text>
		<Text style={[styles.statPillLabel, { color: colors.textSecondary }]} numberOfLines={1}>
			{label}
		</Text>
	</View>
)

const createStyles = (colors: ThemeColors) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: colors.background
		},
		scrollContent: {
			paddingBottom: 24
		},
		emptyWrap: {
			paddingTop: 40,
			paddingHorizontal: 24,
			alignItems: 'center',
			gap: 12
		},
		emptyIcon: {
			width: 80,
			height: 80,
			borderRadius: 24,
			alignItems: 'center',
			justifyContent: 'center'
		},
		emptyText: {
			fontSize: 14,
			fontWeight: '500',
			textAlign: 'center'
		},
		card: {
			marginHorizontal: 16,
			marginTop: 16
		},
		cardHeader: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: 12,
			marginBottom: 14
		},
		cardHeaderLeft: {
			flexDirection: 'row',
			alignItems: 'center',
			flex: 1,
			minWidth: 0,
			gap: 12
		},
		cardAvatar: {
			width: 52,
			height: 52,
			borderRadius: 16,
			borderWidth: 1,
			borderColor: `${colors.primary}30`,
			backgroundColor: colors.surface
		},
		cardAvatarFallback: {
			alignItems: 'center',
			justifyContent: 'center',
			borderWidth: 0
		},
		cardHeaderText: {
			flex: 1,
			minWidth: 0
		},
		cardTitle: {
			fontSize: 17,
			fontWeight: '700',
			letterSpacing: -0.3
		},
		cardSubtitle: {
			fontSize: 13,
			fontWeight: '500',
			marginTop: 2
		},
		kindBadge: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 4,
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 8,
			borderWidth: 1
		},
		kindBadgeText: {
			fontSize: 9,
			fontWeight: '800',
			letterSpacing: 0.6,
			textTransform: 'uppercase'
		},
		cardMetaRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 6,
			marginBottom: 12
		},
		cardMetaText: {
			fontSize: 12,
			fontWeight: '500',
			flex: 1
		},
		statsRow: {
			flexDirection: 'row',
			flexWrap: 'wrap',
			gap: 8,
			marginBottom: 14
		},
		statPill: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 5,
			paddingHorizontal: 10,
			paddingVertical: 6,
			borderRadius: 10,
			borderWidth: 1
		},
		statPillValue: {
			fontSize: 13,
			fontWeight: '800'
		},
		statPillLabel: {
			fontSize: 11,
			fontWeight: '600',
			maxWidth: 90
		},
		cardFooter: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			paddingTop: 12,
			borderTopWidth: StyleSheet.hairlineWidth,
			borderTopColor: `${colors.border}80`
		},
		cardCta: {
			fontSize: 13,
			fontWeight: '700'
		}
	})

export default Dashboard
