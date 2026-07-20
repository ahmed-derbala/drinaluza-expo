import { Stack, usePathname, Redirect, useRouter } from 'expo-router'
import React, { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { View, ActivityIndicator, Platform } from 'react-native'
import { useUpdates, isVersionGreater } from '@/features/updates'
import { config } from '@/config'

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
import { UpdatesProvider } from '@/features/updates'

import { ErrorBoundary } from '@/core/helpers/ErrorBoundary'
import { AppThemeProvider, useTheme } from '@/core/theme'
import { SmartHeader } from '@/core/smart-header'

// Module-level flag — survives component remounts (e.g. user switch)
let startupCheckPerformed = false

function RootLayoutContent() {
	const { checkForUpdates, refreshApkList } = useUpdates()
	const router = useRouter()
	const pathname = usePathname()
	const { user, loading } = useUser()
	const { colors } = useTheme()

	useEffect(() => {
		if (startupCheckPerformed) return
		startupCheckPerformed = true

		const performStartupCheck = async () => {
			try {
				if (Platform.OS === 'web') {
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
