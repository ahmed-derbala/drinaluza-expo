import { Stack } from 'expo-router'
import React from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator } from 'react-native'
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

import { ErrorBoundary } from '@/core/helpers/ErrorBoundary'
import { AppThemeProvider, useTheme } from '@/core/theme'
import { UpdatesProvider, useUpdates } from '@/core/updates/UpdatesContext'
import { UpdatesScreen } from '@/features/updates/UpdatesScreen'

function RootLayoutContent() {
	const { isCheckingStartup, updateType } = useUpdates()

	// Avoid white screen or flickering during startup.
	// While the initial update check is in progress, prevent rendering any app screens.
	if (isCheckingStartup) {
		return (
			<View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
				<ActivityIndicator size="large" color="#0EA5E9" />
			</View>
		)
	}

	// Required updates completely block app usage until updated (Android) or refreshed (Web)
	if (updateType === 'required') {
		return (
			<ErrorBoundary>
				<StatusBar style="light" />
				<UpdatesScreen />
			</ErrorBoundary>
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
				<Stack.Screen name="updates/index" options={{ headerShown: false }} />
			</Stack>
		</ErrorBoundary>
	)
}

export default function RootLayout() {
	return (
		<SafeAreaProvider>
			<AppThemeProvider>
				<ToastProvider>
					<UpdatesProvider>
						<UserProvider>
							<NotificationProvider>
								<SocketProvider>
									<LayoutProvider>
										<SmartKebabMenuProvider>
											<RootLayoutContent />
										</SmartKebabMenuProvider>
									</LayoutProvider>
								</SocketProvider>
							</NotificationProvider>
						</UserProvider>
					</UpdatesProvider>
				</ToastProvider>
			</AppThemeProvider>
		</SafeAreaProvider>
	)
}
