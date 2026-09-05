import { useEffect, useMemo } from 'react'
import { StyleSheet, View, Platform, Alert, useWindowDimensions } from 'react-native'
import * as Sharing from 'expo-sharing'
import { useTheme } from '@theme'
import { translate } from '@translation'
import { SmartHeader } from '@smart-header'
import { config } from '@/config'
import { log } from '@log'
import { useUpdates } from './useUpdates'
import { isVersionGreater } from './UpdatesContext'
import { CurrentVersionCard } from './CurrentVersionCard'
import { LatestReleaseCard } from './LatestReleaseCard'
import { ApkCard } from './ApkCard'

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	scrollContent: {
		padding: 20,
		paddingBottom: 80,
		gap: 28
	},
	section: {
		gap: 14
	},
	row: {
		gap: 12
	},
	apkList: {
		gap: 10
	}
})

export default function UpdatesScreen() {
	const { colors } = useTheme()
	const { width } = useWindowDimensions()
	const { isChecking, isDownloading, downloadedApks, checkForUpdates, installApk, deleteApk, refreshApkList, isPaused } = useUpdates()

	useEffect(() => {
		checkForUpdates()
	}, [checkForUpdates])

	useEffect(() => {
		if (Platform.OS !== 'web') {
			refreshApkList()
		}
	}, [refreshApkList])

	const isAndroid = Platform.OS === 'android'
	const isWide = width > 680
	const maxContentWidth = 920

	const sortedApks = useMemo(() => {
		return [...downloadedApks].sort((a, b) => {
			if (isVersionGreater(a.version, b.version)) return -1
			if (isVersionGreater(b.version, a.version)) return 1
			return 0
		})
	}, [downloadedApks])

	const handleShareApk = async (fileUri: string) => {
		Alert.alert('Quick Share Advisory', 'We recommend using Quick Share or Bluetooth to share this installer file quickly with nearby devices without using mobile data. Do you want to continue?', [
			{ text: translate('cancel', 'Cancel'), style: 'cancel' },
			{
				text: translate('continue', 'Continue'),
				onPress: async () => {
					try {
						if (await Sharing.isAvailableAsync()) {
							await Sharing.shareAsync(fileUri)
						} else {
							Alert.alert(translate('error', 'Error'), 'Sharing is not available on this device.')
						}
					} catch (err) {
						log({ level: 'error', label: 'UpdatesScreen', message: 'Sharing APK failed', error: err })
					}
				}
			}
		])
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<SmartHeader
				title={translate('updates', 'Updates')}
				subtitle={config.app.env}
				fallbackRoute="/feed"
				disableAnimations={true}
				headerActions={[
					<SmartHeader.RefreshButton
						key="refresh"
						onRefresh={async () => {
							if (Platform.OS === 'web' && typeof window !== 'undefined') {
								;(window as any).location.reload()
							} else {
								await checkForUpdates()
							}
						}}
						isRefreshing={isChecking}
						disabled={isDownloading}
					/>
				]}
			/>

			<SmartHeader.ScrollView
				contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 }, isWide && { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%', padding: 32, paddingBottom: 100 }]}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.section}>
					<View style={styles.row}>
						<CurrentVersionCard />
						<LatestReleaseCard />
					</View>
				</View>

				{sortedApks.length > 0 && (
					<View style={styles.section}>
						<View style={styles.apkList}>
							{sortedApks.map((apk) => (
								<ApkCard key={apk.filename} apk={apk} onInstall={installApk} onDelete={deleteApk} onShare={handleShareApk} disabledInstall={!isAndroid || isDownloading || isPaused} />
							))}
						</View>
					</View>
				)}
			</SmartHeader.ScrollView>
		</View>
	)
}
