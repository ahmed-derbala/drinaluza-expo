import { Stack } from 'expo-router'
import React from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator } from 'react-native'
import { AppUpdaterProvider, useAppUpdater } from '@/core/app-updater/AppUpdaterContext'
import { AppUpdater } from '@/core/app-updater/AppUpdater'

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

import { ErrorBoundary } from '@/core/helpers/ErrorBoundary'
import { AppThemeProvider, useTheme } from '@/core/theme'

function RootLayoutContent() {
	const { startupState } = useAppUpdater()

	if (startupState === 'initializing' || startupState === 'checkingUpdate') {
		return (
			<View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
				<ActivityIndicator size="large" color="#3B82F6" />
			</View>
		)
	}

	if (startupState === 'updateRequired') {
		return (
			<View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
				<AppUpdater />
			</View>
		)
	}

	return (
		<ErrorBoundary>
			<StatusBar style="light" />
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
				<Stack.Screen name="auth" options={{ headerShown: false }} />
				<Stack.Screen name="search" options={{ headerShown: false }} />
				<Stack.Screen name="businesses" options={{ headerShown: false }} />
				<Stack.Screen name="products" options={{ headerShown: false }} />
				<Stack.Screen name="users" options={{ headerShown: false }} />
			</Stack>
			<AppUpdater />
		</ErrorBoundary>
	)
}

export default function RootLayout() {
	return (
		<SafeAreaProvider>
			<AppThemeProvider>
				<ToastProvider>
					<UserProvider>
						<NotificationProvider>
							<SocketProvider>
								<LayoutProvider>
									<AppUpdaterProvider>
										<RootLayoutContent />
									</AppUpdaterProvider>
								</LayoutProvider>
							</SocketProvider>
						</NotificationProvider>
					</UserProvider>
				</ToastProvider>
			</AppThemeProvider>
		</SafeAreaProvider>
	)
}
