import { Stack, useRouter, usePathname } from 'expo-router'
import React, { useState, useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { View, ActivityIndicator, Platform } from 'react-native'
import { useUpdates, isVersionGreater } from '@/features/updates'
import { config } from '@/config'
import { showConfirm } from '@/core/helpers/popup'

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

	useEffect(() => {
		const performStartupCheck = async () => {
			try {
				const isWebAndroid = Platform.OS === 'web' && typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '')
				if (isWebAndroid) {
					if (typeof sessionStorage !== 'undefined') {
						const alreadyPrompted = sessionStorage.getItem('apk_download_prompted')
						if (!alreadyPrompted) {
							sessionStorage.setItem('apk_download_prompted', 'true')
							showConfirm(translate('download_apk_title', 'Download App'), translate('download_apk_prompt', 'Do you want to download the Android app for a better experience?'), () => {
								router.replace('/updates')
							})
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

	const { colors } = useTheme()

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
									<SocketProvider>
										<LayoutProvider>
											<RootLayoutContent />
										</LayoutProvider>
									</SocketProvider>
								</NotificationProvider>
							</UserProvider>
						</ToastProvider>
					</SmartKebabMenuProvider>
				</UpdatesProvider>
			</AppThemeProvider>
		</SafeAreaProvider>
	)
}
