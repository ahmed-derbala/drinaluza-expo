import '@/core/bootstrap'
import { Stack, usePathname, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { View, Platform } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useUpdates, isVersionGreater, UpdateCheckResult, DownloadAppModal, DOWNLOAD_APP_MODAL_DISMISSED_KEY } from '@/features/updates'
import { config } from '@/config'
import { getItem } from '@/core/storage'
import { NotificationProvider } from '@/features/notifications/NotificationContext'
import { usePushNotificationNavigation } from '@/features/notifications/usePushNotificationNavigation'
import { UserProvider, useUser } from '@/core/contexts/UserContext'
import { ToastProvider } from '@/features/common/Toast'
import { SocketProvider } from '@/core/socketio/SocketContext'
import { BackendConnectionProvider } from '@/core/connection'
import { LayoutProvider } from '@/core/contexts/LayoutContext'
import { SmartKebabMenuProvider } from '@/core/smart-kebab-menu'
import { UpdatesProvider } from '@/features/updates/UpdatesContext'
import { MediaSettingsProvider } from '@/features/settings/MediaSettingsContext'
import { UpdateSettingsProvider } from '@/features/settings/UpdateSettingsContext'
import { AppThemeProvider, useTheme, themeColors } from '@/core/theme'
import { SmartHeader } from '@/core/smart-header'
import Spinner from '@/features/common/Spinner'
import ErrorBlock from '@/core/error/ErrorBlock'
import { log } from '@/core/log'
import { deferStartup } from '@/core/helpers/defer'
import { translate } from '@/core/translation'
import { SafeAreaView } from 'react-native-safe-area-context'

// Module-level flag — survives component remounts (e.g. user switch)
let startupCheckPerformed = false

function RootLayoutContent() {
	const { checkForUpdates, refreshApkList } = useUpdates()
	const router = useRouter()
	usePushNotificationNavigation()
	const pathname = usePathname()
	const { user, loading } = useUser()
	const { colors } = useTheme()
	const [downloadAppRelease, setDownloadAppRelease] = useState<UpdateCheckResult | null>(null)

	useEffect(() => {
		if (startupCheckPerformed) return
		startupCheckPerformed = true

		const performStartupCheck = async () => {
			try {
				if (Platform.OS === 'web') {
					const isDismissed = await getItem<boolean>(DOWNLOAD_APP_MODAL_DISMISSED_KEY)
					if (isDismissed) return

					const result = await checkForUpdates(false)
					if (result) {
						setDownloadAppRelease(result)
					}
					return
				}

				const stored = await getItem<{ enabled: boolean }>('updateSettings')
				const enabled = stored?.enabled ?? true
				if (!enabled) return

				// 1. Instantly check if there is a downloaded APK ready to install (no network delay)
				if (Platform.OS === 'android') {
					const freshApks = await refreshApkList()
					const installableApk = freshApks.find((apk) => apk.isInstallable)
					if (installableApk) {
						router.replace('/updates')
						return
					}
				}

				// 2. Perform network check for new updates
				const result = await checkForUpdates(false)
				if (result && isVersionGreater(result.latest_version, config.app.version)) {
					router.replace('/updates')
				}
			} catch (e) {
				log({ level: 'warn', label: 'StartupGate', message: 'Startup check failed', error: e })
			}
		}

		// Defer update check so feed paints first — cached feed has priority
		// Low priority: 2500ms after idle, avoids blocking initial navigation & cache read
		const cancel = deferStartup.low(() => {
			performStartupCheck()
		})
		return cancel
	}, [checkForUpdates, refreshApkList, router])

	const isAuthenticated = !!user
	const isRestrictedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/notifications') || pathname.startsWith('/purchases') || pathname.startsWith('/profile')

	useEffect(() => {
		if (isRestrictedRoute && !loading && !isAuthenticated) {
			router.replace('/auth')
		}
	}, [isRestrictedRoute, loading, isAuthenticated, router])

	// Prioritize feed display: only block restricted routes while user is still loading.
	// Public routes (/feed, /search, /auth, etc.) render immediately with cached data.
	if (isRestrictedRoute) {
		if (loading) {
			return <Spinner />
		}
		if (!isAuthenticated) {
			return <Spinner />
		}
	}

	return (
		<>
			<DownloadAppModal visible={!!downloadAppRelease} release={downloadAppRelease} onClose={() => setDownloadAppRelease(null)} />
			<Stack
				screenOptions={{
					contentStyle: {
						backgroundColor: colors.background
					}
				}}
			>
				<Stack.Screen name="index" options={{ headerShown: false }} />
				<Stack.Screen name="(home)" options={{ headerShown: false }} />
				<Stack.Screen name="dashboard" options={{ headerShown: false }} />
				<Stack.Screen name="auth/index" options={{ headerShown: false }} />
				<Stack.Screen name="search" options={{ headerShown: false }} />
				<Stack.Screen name="businesses" options={{ headerShown: false }} />
				<Stack.Screen name="products" options={{ headerShown: false }} />
				<Stack.Screen name="users" options={{ headerShown: false }} />
				<Stack.Screen name="about/index" options={{ headerShown: false }} />
				<Stack.Screen name="updates/index" options={{ headerShown: false }} />
				<Stack.Screen name="settings/index" options={{ headerShown: false }} />
				<Stack.Screen name="purchases" options={{ headerShown: false }} />
				<Stack.Screen name="notifications" options={{ headerShown: false }} />
			</Stack>
		</>
	)
}

export function ErrorBoundary({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
	log({ level: 'error', label: 'RootErrorBoundary', message: error?.message || 'Unhandled navigation error', error, data: { digest: (error as any)?.digest } })

	// Use static themeColors to avoid dependency on AppThemeProvider which may be the error source.
	// SmartHeader inside relies on LayoutProvider/AppThemeProvider; wrap with providers again for fallback.
	// Avoid default headerActions (notifications/cart) which require NotificationProvider/UserProvider
	return (
		<SafeAreaProvider>
			<AppThemeProvider>
				<MediaSettingsProvider>
					<UpdateSettingsProvider>
						<UpdatesProvider>
							<SmartKebabMenuProvider>
								<ToastProvider>
									<LayoutProvider>
										<SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
											<View style={{ flex: 1, backgroundColor: themeColors.background }}>
												<SmartHeader title={translate('error', 'Error')} fallbackRoute="/feed" headerActions={[]} />
												<ErrorBlock error={error} onRetry={retry} />
											</View>
										</SafeAreaView>
									</LayoutProvider>
								</ToastProvider>
							</SmartKebabMenuProvider>
						</UpdatesProvider>
					</UpdateSettingsProvider>
				</MediaSettingsProvider>
			</AppThemeProvider>
		</SafeAreaProvider>
	)
}

export default function RootLayout() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<AppThemeProvider>
					<MediaSettingsProvider>
						<UpdateSettingsProvider>
							<UpdatesProvider>
								<SmartKebabMenuProvider>
									<ToastProvider>
										<UserProvider>
											<NotificationProvider>
												<BackendConnectionProvider>
													<SocketProvider>
														<LayoutProvider>
															<RootLayoutContent />
														</LayoutProvider>
													</SocketProvider>
												</BackendConnectionProvider>
											</NotificationProvider>
										</UserProvider>
									</ToastProvider>
								</SmartKebabMenuProvider>
							</UpdatesProvider>
						</UpdateSettingsProvider>
					</MediaSettingsProvider>
				</AppThemeProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	)
}
