import { useMemo, useRef, useCallback, useState } from 'react'
import { StyleSheet, View, useWindowDimensions } from 'react-native'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { useScrollHandler } from '@/core/scroll'
import { SmartHeader } from '@/core/smart-header'
import { CacheDetailsCard, type CacheDetailsCardHandle } from '@/features/settings/CacheDetailsCard'
import { BackendServerInfosCard, type BackendServerInfosCardHandle } from '@/features/settings/BackendServerInfosCard'
import { MediaSettingsCard } from '@/features/settings/MediaSettingsCard'
import { SettingsUpdatesCard } from '@/features/settings/SettingsUpdatesCard'
import { ResetAppCard } from './ResetAppCard'

export function SettingsScreen() {
	const { colors } = useTheme()
	const { width } = useWindowDimensions()
	const maxWidth = 600
	const isWideScreen = width > maxWidth
	const { onScroll } = useScrollHandler()
	const cacheRef = useRef<CacheDetailsCardHandle>(null)
	const backendRef = useRef<BackendServerInfosCardHandle>(null)
	const [isHeaderRefreshing, setIsHeaderRefreshing] = useState(false)

	const handleHeaderRefresh = useCallback(async () => {
		setIsHeaderRefreshing(true)
		try {
			await Promise.all([cacheRef.current?.refresh?.(), backendRef.current?.refresh?.()])
		} finally {
			setIsHeaderRefreshing(false)
		}
	}, [])

	const styles = useMemo(() => createStyles(colors), [colors])

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<SmartHeader
				title={translate('settings', 'Settings')}
				fallbackRoute="/(home)/feed"
				headerActions={[<SmartHeader.RefreshButton key="refresh" onRefresh={handleHeaderRefresh} isRefreshing={isHeaderRefreshing} />]}
			/>

			<SmartHeader.ScrollView
				style={styles.scrollView}
				contentContainerStyle={[styles.contentContainer, isWideScreen && { maxWidth, alignSelf: 'center', width: '100%' }]}
				onScroll={onScroll}
				scrollEventThrottle={16}
			>
				<View style={styles.topSpacer} />

				{/* Media Settings */}
				<MediaSettingsCard />

				{/* Primary Card: Cached Data Details */}
				<CacheDetailsCard ref={cacheRef} />

				{/* Backend Server Info */}
				<BackendServerInfosCard ref={backendRef} />

				{/* Update Settings */}
				<SettingsUpdatesCard />

				{/* Danger Zone: Reset App */}
				<ResetAppCard />
			</SmartHeader.ScrollView>
		</View>
	)
}

const createStyles = (colors: any) =>
	StyleSheet.create({
		container: {
			flex: 1
		},
		scrollView: {
			flex: 1
		},
		contentContainer: {
			padding: 20,
			paddingBottom: 90
		},
		topSpacer: {
			height: 16
		}
	})

export default SettingsScreen
