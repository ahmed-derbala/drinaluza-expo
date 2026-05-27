import { Stack } from 'expo-router'
import React from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'

// Prevent native splash screen from hiding automatically
SplashScreen.preventAutoHideAsync().catch(() => {})

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
import { UpdaterProvider } from '@/features/appUpdater/AppUpdater'

import { ErrorBoundary } from '@/core/helpers/ErrorBoundary'
import { AppThemeProvider } from '@/core/theme'

function RootLayoutContent() {
	return (
		<ErrorBoundary>
			<Stack>
				<Stack.Screen name="index" options={{ headerShown: false }} />
				<Stack.Screen name="(home)" options={{ headerShown: false }} />
				<Stack.Screen name="dashboard" options={{ headerShown: false }} />
				<Stack.Screen name="auth" options={{ headerShown: false }} />
				<Stack.Screen name="search" options={{ headerShown: false }} />
				<Stack.Screen name="businesses" options={{ headerShown: false }} />
				<Stack.Screen name="products" options={{ headerShown: false }} />
				<Stack.Screen name="users" options={{ headerShown: false }} />
			</Stack>
		</ErrorBoundary>
	)
}

export default function RootLayout() {
	return (
		<SafeAreaProvider>
			<AppThemeProvider>
				<ToastProvider>
					<UpdaterProvider>
						<UserProvider>
							<NotificationProvider>
								<SocketProvider>
									<LayoutProvider>
										<RootLayoutContent />
									</LayoutProvider>
								</SocketProvider>
							</NotificationProvider>
						</UserProvider>
					</UpdaterProvider>
				</ToastProvider>
			</AppThemeProvider>
		</SafeAreaProvider>
	)
}
