import { Stack, useRouter, usePathname } from 'expo-router'
import React, { useState, useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { View, Text, TouchableOpacity, ActivityIndicator, Platform, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useUpdates, isVersionGreater } from '@/features/updates'
import { config } from '@/config'
import { CenteredModal } from '@/core/smart-modal'

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
import { UpdatesProvider } from '@/features/updates'

import { ErrorBoundary } from '@/core/helpers/ErrorBoundary'
import { AppThemeProvider, useTheme } from '@/core/theme'
import { SmartHeader } from '@/core/smart-header'

function RootLayoutContent() {
	const { checkForUpdates, refreshApkList, installApk } = useUpdates()
	const router = useRouter()
	const pathname = usePathname()
	const { user, loading, translate } = useUser()
	const { colors } = useTheme()
	const [showDownloadAppModal, setShowDownloadAppModal] = useState(false)

	useEffect(() => {
		const performStartupCheck = async () => {
			try {
				const isWebAndroid = Platform.OS === 'web' && typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '')
				if (isWebAndroid) {
					if (typeof sessionStorage !== 'undefined') {
						const alreadyPrompted = sessionStorage.getItem('apk_download_prompted')
						if (!alreadyPrompted) {
							sessionStorage.setItem('apk_download_prompted', 'true')
							setShowDownloadAppModal(true)
						}
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

				// 2. Otherwise, perform network check for new updates
				const result = await checkForUpdates(false)
				if (result && isVersionGreater(result.latest_version, config.app.version)) {
					router.replace('/updates')
				}
			} catch (e) {
				console.warn('[StartupGate] Startup check failed:', e)
			}
		}

		performStartupCheck()
	}, [checkForUpdates, refreshApkList, installApk, router, translate])

	useEffect(() => {
		if (loading) return

		const isAuthenticated = !!user
		const isBusinessOwner = user?.role === 'business_owner'

		if (pathname.startsWith('/dashboard')) {
			if (!isAuthenticated) {
				router.replace('/auth')
			} else if (!isBusinessOwner) {
				router.replace('/feed')
			}
		} else if (pathname.startsWith('/notifications') || pathname.startsWith('/purchases') || pathname.startsWith('/profile')) {
			if (!isAuthenticated) {
				router.replace('/auth')
			}
		}
	}, [user, loading, pathname, router])

	if (loading) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background || '#000000' }}>
				<ActivityIndicator size="large" color={colors.primary || '#0EA5E9'} />
			</View>
		)
	}

	return (
		<ErrorBoundary>
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

			<CenteredModal
				visible={showDownloadAppModal}
				onClose={() => setShowDownloadAppModal(false)}
				title={translate('download_apk_title', 'Download App')}
				headerIcon={
					<View style={[styles.downloadModalIcon, { backgroundColor: colors.primary + '15' }]}>
						<Ionicons name="download-outline" size={24} color={colors.primary} />
					</View>
				}
				footer={
					<View style={styles.downloadModalActions}>
						<TouchableOpacity style={[styles.downloadModalButton, styles.downloadModalCancelButton, { borderColor: colors.border }]} onPress={() => setShowDownloadAppModal(false)}>
							<Text style={[styles.downloadModalButtonText, { color: colors.textSecondary }]}>{translate('cancel', 'Cancel')}</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.downloadModalButton, styles.downloadModalSubmitButton, { backgroundColor: colors.primary }]}
							onPress={() => {
								setShowDownloadAppModal(false)
								router.replace('/updates')
							}}
						>
							<Text style={[styles.downloadModalButtonText, { color: '#fff' }]}>{translate('download', 'Download')}</Text>
						</TouchableOpacity>
					</View>
				}
			>
				<View style={styles.downloadModalContent}>
					<Text style={[styles.downloadModalText, { color: colors.text }]}>{translate('download_apk_prompt', 'Do you want to download the Android app for a better experience?')}</Text>
				</View>
			</CenteredModal>
		</ErrorBoundary>
	)
}

const styles = StyleSheet.create({
	downloadModalContent: {
		paddingVertical: 8,
		width: '100%'
	},
	downloadModalText: {
		fontSize: 16,
		fontWeight: '500',
		lineHeight: 22,
		textAlign: 'center'
	},
	downloadModalIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: 'center',
		alignItems: 'center'
	},
	downloadModalActions: {
		flexDirection: 'row',
		gap: 12
	},
	downloadModalButton: {
		flex: 1,
		padding: 16,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: 48
	},
	downloadModalCancelButton: {
		borderWidth: 1,
		backgroundColor: 'transparent'
	},
	downloadModalSubmitButton: {
		// backgroundColor set dynamically
	},
	downloadModalButtonText: {
		fontSize: 16,
		fontWeight: '600'
	}
})

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
