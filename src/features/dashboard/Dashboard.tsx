import { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, ThemeColors } from '@theme'
import ErrorBlock from '@error/ErrorBlock'
import { useUser } from '@contexts/UserContext'
import { useScrollHandler } from '@scroll'
import { HeaderRefreshButton, SmartHeader } from '@smart-header'
import Spinner from '@ui/spinner/Spinner'
import { useDashboardProfiles } from './useDashboardProfiles'
import { DashboardProfile, isBusinessDashboard, sortDashboardProfiles } from './dashboard.interface'
import PersonalDashboardCard from './PersonalDashboardCard'
import BusinessDashboardCard from './BusinessDashboardCard'

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
						headerActions: headerActions
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
				) : (
					<>
						{personalProfile ? <PersonalDashboardCard profile={personalProfile} onPress={() => handlePressProfile(personalProfile)} /> : null}
						{businessProfiles.map((profile) => (
							<BusinessDashboardCard key={profile._id} profile={profile} onPress={() => handlePressProfile(profile)} />
						))}
					</>
				)}
			</SmartHeader.ScrollView>
		</View>
	)
}

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
		}
	})

export default Dashboard
