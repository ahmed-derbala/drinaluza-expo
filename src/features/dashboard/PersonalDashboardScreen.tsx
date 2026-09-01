import { useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme, ThemeColors } from '@/core/theme'
import { HeaderRefreshButton, SmartHeader } from '@/core/smart-header'
import Spinner from '@/features/common/Spinner'
import ErrorBlock from '@/core/error/ErrorBlock'
import { useUser } from '@/core/contexts/UserContext'
import { useScrollHandler } from '@/core/scroll'
import { SmartMediaView } from '@/core/smart-media'
import { usePersonalDashboard } from './usePersonalDashboard'
import { isPersonalDashboard, DashboardRankItem } from './dashboard.interface'
const PersonalDashboardScreen = () => {
	const { colors } = useTheme()
	const styles = useMemo(() => createStyles(colors), [colors])
	const { localize, translate, user } = useUser()
	const router = useRouter()
	const { onScroll } = useScrollHandler()
	const insets = useSafeAreaInsets()
	const { data: dashboardResponse, isInitialLoading, isRefreshing, isOffline, refresh } = usePersonalDashboard()
	const dashboardData = dashboardResponse?.data ?? null
	const onRefresh = useCallback(() => {
		refresh()
	}, [refresh])
	const headerActions = useMemo(() => [<HeaderRefreshButton key="refresh" onRefresh={onRefresh} isRefreshing={isRefreshing} isOffline={isOffline} />], [onRefresh, isRefreshing, isOffline])
	if (isInitialLoading) {
		return <Spinner />
	}
	if (isOffline && !dashboardData) {
		return (
			<View style={styles.container}>
				<Stack.Screen options={{ title: translate('error', 'Error'), headerActions: headerActions } as any} />
				<ErrorBlock />
			</View>
		)
	}
	if (!dashboardData || !isPersonalDashboard(dashboardData)) {
		return (
			<View style={styles.container}>
				<Stack.Screen options={{ title: translate('error', 'Error'), headerActions: headerActions } as any} />
				<ErrorBlock />
			</View>
		)
	}
	const personalUser = dashboardData.user
	return (
		<View style={styles.container}>
			<Stack.Screen
				options={
					{
						title: translate('dashboard.personal', 'Personal'),
						subtitle: `@${personalUser.slug}`,
						headerActions: headerActions
					} as any
				}
			/>
			<SmartHeader.ScrollView
				contentContainerStyle={[styles.scrollContent, { paddingBottom: 90 + insets.bottom }]}
				refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
				showsVerticalScrollIndicator={false}
				onScroll={onScroll}
				scrollEventThrottle={16}
			>
				<LinearGradient colors={[colors.primaryContainer, colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
					<View style={[styles.heroAvatar, { backgroundColor: `${colors.primary}20` }]}>
						<Ionicons name="person-outline" size={36} color={colors.primary} />
					</View>
					<View style={styles.heroInfo}>
						<View style={[styles.kindBadge, { backgroundColor: `${colors.primary}25` }]}>
							<Ionicons name="person-outline" size={12} color={colors.primary} />
							<Text style={[styles.kindBadgeText, { color: colors.primary }]}>{translate('dashboard.personal', 'Personal')}</Text>
						</View>
						<Text style={[styles.heroTitle, { color: colors.text }]}>{localize(personalUser.name)}</Text>
						<Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>@{personalUser.slug}</Text>
						{user?.email && (
							<Text style={[styles.heroMeta, { color: colors.textTertiary }]} numberOfLines={1}>
								{user.email}
							</Text>
						)}
					</View>
				</LinearGradient>
				<SectionTitle title={translate('dashboard.top_businesses', 'Your businesses')} colors={colors} />
				<RankPairSection
					title={translate('dashboard.top_businesses_frequent', 'Most frequent')}
					emptyHint={translate('dashboard.no_businesses_yet', 'No business activity yet')}
					items={dashboardData.topBusinesses.frequent}
					styles={styles}
					colors={colors}
					router={router}
				/>
				<RankPairSection
					title={translate('dashboard.top_businesses_new', 'Newest')}
					emptyHint={translate('dashboard.no_businesses_yet', 'No business activity yet')}
					items={dashboardData.topBusinesses.new}
					styles={styles}
					colors={colors}
					router={router}
				/>
			</SmartHeader.ScrollView>
		</View>
	)
}
// --- Shared UI pieces ---
const SectionTitle = ({ title, colors }: { title: string; colors: ThemeColors }) => (
	<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 10 }}>
		<View style={{ width: 4, height: 22, borderRadius: 2, backgroundColor: colors.primary }} />
		<Text style={{ fontSize: 19, fontWeight: '800', color: colors.text, letterSpacing: -0.5, flex: 1 }}>{title}</Text>
	</View>
)
type RankPairSectionProps = {
	title: string
	emptyHint: string
	items: DashboardRankItem[]
	styles: ReturnType<typeof createStyles>
	colors: ThemeColors
	router: ReturnType<typeof useRouter>
}
const RankPairSection = ({ title, emptyHint, items, styles, colors, router }: RankPairSectionProps) => {
	const { localize } = useUser()
	if (items.length === 0) {
		return (
			<View style={[styles.rankPanel, { backgroundColor: colors.background, borderColor: colors.border, marginBottom: 14 }]}>
				<Text style={[styles.rankPanelTitle, { color: colors.text }]}>{title}</Text>
				<Text style={[styles.rankEmpty, { color: colors.textTertiary }]}>{emptyHint}</Text>
			</View>
		)
	}
	return (
		<View style={[styles.rankPanel, { backgroundColor: colors.background, borderColor: colors.border, marginBottom: 14 }]}>
			<Text style={[styles.rankPanelTitle, { color: colors.text }]}>{title}</Text>
			{items.slice(0, 5).map((item, index) => {
				const isLast = index === Math.min(items.length, 5) - 1
				const slug = item.slug
				return (
					<TouchableOpacity
						key={item._id || `${title}-${index}`}
						activeOpacity={0.8}
						disabled={!slug}
						onPress={() => slug && router.push(`/dashboard/${slug}/` as never)}
						style={[styles.rankRow, { borderColor: `${colors.border}60` }, isLast && { borderBottomWidth: 0 }]}
					>
						<SmartMediaView media={item.media?.thumbnail?.url} style={styles.rankAvatar} />
						<View style={styles.rankTextWrap}>
							<Text style={[styles.rankName, { color: colors.text }]} numberOfLines={1}>
								{item.name ? localize(item.name) : slug || '—'}
							</Text>
							{slug && (
								<Text style={[styles.rankSlug, { color: colors.textTertiary }]} numberOfLines={1}>
									@{slug}
								</Text>
							)}
						</View>
						{item.count !== undefined && (
							<View style={[styles.rankMetric, { backgroundColor: `${colors.primary}15` }]}>
								<Text style={[styles.rankMetricText, { color: colors.primary }]}>{item.count}</Text>
							</View>
						)}
						<Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
					</TouchableOpacity>
				)
			})}
		</View>
	)
}
const createStyles = (colors: ThemeColors) =>
	StyleSheet.create({
		container: { flex: 1, backgroundColor: colors.background },
		scrollContent: { paddingHorizontal: 16, paddingBottom: 90, paddingTop: 12, gap: 6 },
		heroCard: {
			borderRadius: 28,
			padding: 24,
			flexDirection: 'row',
			alignItems: 'center',
			gap: 18,
			borderWidth: 1,
			borderColor: `${colors.primary}15`,
			marginBottom: 12
		},
		heroAvatar: {
			width: 80,
			height: 80,
			borderRadius: 22,
			borderWidth: 2,
			borderColor: `${colors.primary}30`,
			alignItems: 'center',
			justifyContent: 'center'
		},
		heroInfo: { flex: 1, minWidth: 0 },
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
		rankPanel: {
			borderRadius: 22,
			borderWidth: 1,
			padding: 16,
			minHeight: 140
		},
		rankPanelTitle: { fontSize: 14, fontWeight: '800', marginBottom: 12, letterSpacing: -0.2 },
		rankEmpty: { fontSize: 12, lineHeight: 20, paddingVertical: 10, fontStyle: 'italic' },
		rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
		rankAvatar: { width: 36, height: 36, borderRadius: 10 },
		rankTextWrap: { flex: 1, minWidth: 0 },
		rankName: { fontSize: 13, fontWeight: '600', letterSpacing: -0.1 },
		rankSlug: { fontSize: 11, fontWeight: '500', marginTop: 1 },
		rankMetric: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
		rankMetricText: { fontSize: 11, fontWeight: '800' }
	})
export default PersonalDashboardScreen
