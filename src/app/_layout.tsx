import { Stack } from 'expo-router'
import React from 'react'

// Polyfill for setImmediate which is missing in some web environments
if (typeof setImmediate === 'undefined') {
	// @ts-ignore
	global.setImmediate = (callback: (...args: any[]) => void) => setTimeout(callback, 0)
}

import { VersionProvider } from '@/core/contexts/VersionContext'
import { NotificationProvider } from '@/features/notifications/NotificationContext'
import { UserProvider } from '@/core/contexts/UserContext'
import { ToastProvider } from '@/features/common/Toast'
import { SocketProvider } from '@/core/socketio/SocketContext'
import { LayoutProvider } from '@/core/contexts/LayoutContext'

import { ErrorBoundary } from '@/core/helpers/ErrorBoundary'
import { AppThemeProvider } from '@/core/theme'

function RootLayoutContent() {
	return (
		<ErrorBoundary>
			<AppThemeProvider>
				<Stack>
					<Stack.Screen name="index" options={{ headerShown: false }} />
					<Stack.Screen name="(home)" options={{ headerShown: false }} />
					<Stack.Screen name="businesses" options={{ headerShown: false }} />
					<Stack.Screen name="dashboard" options={{ headerShown: false }} />
					<Stack.Screen name="users" options={{ headerShown: false }} />
					<Stack.Screen name="auth" options={{ headerShown: false }} />
					<Stack.Screen name="search" options={{ headerShown: false }} />
				</Stack>
			</AppThemeProvider>
		</ErrorBoundary>
	)
}

export default function RootLayout() {
	return (
		<ToastProvider>
			<VersionProvider>
				<UserProvider>
					<NotificationProvider>
						<SocketProvider>
							<LayoutProvider>
								<RootLayoutContent />
							</LayoutProvider>
						</SocketProvider>
					</NotificationProvider>
				</UserProvider>
			</VersionProvider>
		</ToastProvider>
	)
}
