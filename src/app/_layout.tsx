import { Stack } from 'expo-router'
import React from 'react'

// Polyfill for setImmediate which is missing in some web environments
if (typeof setImmediate === 'undefined') {
	// @ts-ignore
	global.setImmediate = (callback: (...args: any[]) => void) => setTimeout(callback, 0)
}

import { ThemeProvider, VersionProvider, NotificationProvider, UserProvider, ToastProvider, SocketProvider } from '@/core/contexts'
import { ErrorBoundary } from '@/core/helpers/ErrorBoundary'

import { getPlatformStackOptions } from '@/config/navigation'

function RootLayoutContent() {
	const stackOptions = getPlatformStackOptions({
		headerShown: false
	})

	return (
		<ErrorBoundary>
			<Stack screenOptions={stackOptions} />
		</ErrorBoundary>
	)
}

export default function RootLayout() {
	return (
		<ThemeProvider>
			<ToastProvider>
				<VersionProvider>
					<NotificationProvider>
						<UserProvider>
							<SocketProvider>
								<RootLayoutContent />
							</SocketProvider>
						</UserProvider>
					</NotificationProvider>
				</VersionProvider>
			</ToastProvider>
		</ThemeProvider>
	)
}
