import { Stack, useRouter } from 'expo-router'
import React, { useState, useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { View, ActivityIndicator, Platform } from 'react-native'
import { useUpdates, isVersionGreater } from '@/features/updates'
import { config } from '@/config'

// Polyfill for setImmediate which is missing in some web environments
if (typeof setImmediate === 'undefined') {
	// @ts-ignore
	global.setImmediate = (callback: (...args: any[]) => void) => setTimeout(callback, 0)
}

import { NotificationProvider } from '@/features/notifications/NotificationContext'
import { UserProvider } from '@/core/contexts/UserContext'
import { ToastProvider } from '@/features/common/Toast'
import { SocketProvider } from '@/core/socketio/SocketContext'
import { LayoutProvider } from '@/core/contexts/LayoutContext'
import { SmartKebabMenuProvider } from '@/core/smart-kebab-menu'
import { UpdatesProvider } from '@/features/updates'

import { ErrorBoundary } from '@/core/helpers/ErrorBoundary'
import { AppThemeProvider, useTheme } from '@/core/theme'

function RootLayoutContent() {
	const { checkForUpdates, refreshApkList, installApk } = useUpdates()
	const [isStartupChecking, setIsStartupChecking] = useState(true)
	const router = useRouter()

	useEffect(() => {
		const performStartupCheck = async () => {
			if (Platform.OS !== 'android') {
				setIsStartupChecking(false)
				return
			}

			try {
				const release = await checkForUpdates(false)
				if (release) {
					const hasNewerRelease = isVersionGreater(release.latest_version, config.app.version)
					if (hasNewerRelease) {
						// There is a newer version! Redirect to updates page
						setIsStartupChecking(false)
						setTimeout(() => {
							router.replace('/updates' as any)
						}, 0)
						return
					} else {
						// Current version is equal or higher! Check for ready downloaded APKs
						const freshApks = await refreshApkList()
						const installableApk = freshApks.find((apk) => apk.isInstallable)
						if (installableApk) {
							// Trigger package installation
							await installApk(installableApk.fileUri)
						}
					}
				}
			} catch (e) {
				console.warn('[StartupGate] Startup update check failed:', e)
			} finally {
				setIsStartupChecking(false)
			}
		}

		performStartupCheck()
	}, [])

	if (isStartupChecking) {
		// Solid black splash gate to completely prevent white flashes or home screen rendering
		return (
			<View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
				<ActivityIndicator size="large" color="#0EA5E9" />
			</View>
		)
	}

	return (
		<ErrorBoundary>
			<Stack
				screenOptions={{
					contentStyle: {
						backgroundColor: '#000000'
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
