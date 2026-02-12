import { Stack } from 'expo-router'
import React from 'react'

// Polyfill for setImmediate which is missing in some web environments
if (typeof setImmediate === 'undefined') {
	// @ts-ignore
	global.setImmediate = (callback: (...args: any[]) => void) => setTimeout(callback, 0)
}

import { ThemeProvider } from '@/core/contexts/ThemeContext'
import { VersionProvider } from '@/core/contexts/VersionContext'
import { NotificationProvider } from '@/core/contexts/NotificationContext'
import { UserProvider } from '@/core/contexts/UserContext'
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
			<VersionProvider>
				<NotificationProvider>
					<UserProvider>
						<RootLayoutContent />
					</UserProvider>
				</NotificationProvider>
			</VersionProvider>
		</ThemeProvider>
	)
}
