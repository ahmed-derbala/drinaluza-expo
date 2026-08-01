import { Stack, usePathname, Redirect, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { View, ActivityIndicator, Platform, StyleSheet } from 'react-native'
import { useUpdates, isVersionGreater, UpdateCheckResult } from '@/features/updates'
import { config } from '@/config'
import { getItem, setItem } from '@/core/storage'
import { translate } from '@/core/translation'
import { SmartModal } from '@/core/smart-modal'
import { DownloadUpdateButton } from '@/features/common/buttons/DownloadUpdateButton'
import { CancelButton } from '@/features/common/buttons/CancelButton'
import { EyeButton } from '@/features/common/buttons/EyeButton'

// Polyfill for setImmediate which is missing in some web environments
if (typeof setImmediate === 'undefined') {
	// @ts-ignore
	global.setImmediate = (callback: (...args: any[]) => void) => setTimeout(callback, 0)
}

// Enable text selection on Web by injecting a global style sheet
if (Platform.OS === 'web' && typeof document !== 'undefined') {
	const style = document.createElement('style')
	style.type = 'text/css'
	style.innerHTML = `
		html, body {
			background-color: #000000 !important;
			color-scheme: dark;
		}
		* {
			user-select: text !important;
			-webkit-user-select: text !important;
			-moz-user-select: text !important;
			-ms-user-select: text !important;
			-khtml-user-select: text !important;
		}
		button, [role="button"], [role="tab"], [role="img"] {
			user-select: none !important;
			-webkit-user-select: none !important;
			-moz-user-select: none !important;
			-ms-user-select: none !important;
		}
	`
	document.head.appendChild(style)
}

import { NotificationProvider } from '@/features/notifications/NotificationContext'
import { UserProvider, useUser } from '@/core/contexts/UserContext'
import { ToastProvider } from '@/features/common/Toast'
import { SocketProvider } from '@/core/socketio/SocketContext'
import { BackendConnectionProvider } from '@/core/connection'
import { LayoutProvider } from '@/core/contexts/LayoutContext'
import { SmartKebabMenuProvider } from '@/core/smart-kebab-menu'
import { UpdatesProvider } from '@/features/updates/UpdatesContext'
import { ErrorBoundary } from '@/core/helpers/ErrorBoundary'
import { AppThemeProvider, useTheme } from '@/core/theme'
import { SmartHeader } from '@/core/smart-header'

// Module-level flag — survives component remounts (e.g. user switch)
let startupCheckPerformed = false

// Storage key for the "don't show again" preference of the web update modal
const WEB_UPDATE_MODAL_DISMISSED_KEY = 'web_update_modal_dismissed'

const updateModalStyles = StyleSheet.create({
	actionRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 16
	},
	iconButton: {
		height: 56,
		minWidth: 56,
		flex: 0
	},
	checkboxRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 4,
		gap: 8
	}
})

function RootLayoutContent() {
	const { checkForUpdates, refreshApkList } = useUpdates()
	const router = useRouter()
	const pathname = usePathname()
	const { user, loading } = useUser()
	const { colors } = useTheme()
	const [webUpdateModal, setWebUpdateModal] = useState<UpdateCheckResult | null>(null)
	const [dontShowWebUpdateModalAgain, setDontShowWebUpdateModalAgain] = useState(false)

	useEffect(() => {
		if (startupCheckPerformed) return
		startupCheckPerformed = true

		const performStartupCheck = async () => {
			try {
				if (Platform.OS === 'web') {
					const isDismissed = await getItem<boolean>(WEB_UPDATE_MODAL_DISMISSED_KEY)
					if (isDismissed) return

					const result = await checkForUpdates(false)
					if (result) {
						setWebUpdateModal(result)
					}
					return
				}

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
				console.warn('[StartupGate] Startup check failed:', e)
			}
		}

		performStartupCheck()
	}, [checkForUpdates, refreshApkList, router])

	const closeWebUpdateModal = async () => {
		if (dontShowWebUpdateModalAgain) {
			await setItem(WEB_UPDATE_MODAL_DISMISSED_KEY, true)
		}
		setWebUpdateModal(null)
	}

	if (loading) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background || '#000000' }}>
				<ActivityIndicator size="large" color={colors.primary || '#0EA5E9'} />
			</View>
		)
	}

	const isAuthenticated = !!user
	const isBusinessOwner = user?.role === 'business_owner'
	const isRestrictedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/notifications') || pathname.startsWith('/purchases') || pathname.startsWith('/profile')

	if (isRestrictedRoute) {
		if (pathname.startsWith('/dashboard')) {
			if (!isAuthenticated) {
				return <Redirect href="/auth" />
			} else if (!isBusinessOwner) {
				return <Redirect href="/feed" />
			}
		} else if (!isAuthenticated) {
			return <Redirect href="/auth" />
		}
	}

	return (
		<ErrorBoundary>
			<SmartModal
				visible={!!webUpdateModal}
				onClose={closeWebUpdateModal}
				icon="logo-android"
				title={translate('download_app', 'Download App')}
				message={webUpdateModal ? `drinaluza-${webUpdateModal.latest_version}.apk` : undefined}
				footer={
					<View style={updateModalStyles.actionRow}>
						<EyeButton
							onPress={() => setDontShowWebUpdateModalAgain((prev) => !prev)}
							visible={dontShowWebUpdateModalAgain}
							label={translate('dont_show_again', "Don't show again")}
							accessibilityRole="checkbox"
							accessibilityState={{ checked: dontShowWebUpdateModalAgain }}
						/>
						<CancelButton onPress={closeWebUpdateModal} style={updateModalStyles.iconButton} />
						<DownloadUpdateButton
							downloadUrl={webUpdateModal?.download_url}
							version={webUpdateModal?.latest_version}
							onAfterDownload={closeWebUpdateModal}
							variant="primary"
							style={updateModalStyles.iconButton}
						/>
					</View>
				}
			/>
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
				<Stack.Screen name="purchases" options={{ headerShown: false }} />
				<Stack.Screen
					name="settings"
					options={{
						headerShown: true,
						header: (props: any) => <SmartHeader {...props} />
					}}
				/>
			</Stack>
		</ErrorBoundary>
	)
}

export default function RootLayout() {
	return (
		<SafeAreaProvider>
			<AppThemeProvider>
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
			</AppThemeProvider>
		</SafeAreaProvider>
	)
}
