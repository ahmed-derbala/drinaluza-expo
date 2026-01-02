import { Stack } from 'expo-router'
import React from 'react'
import { ThemeProvider } from '../contexts/ThemeContext'

import { getPlatformStackOptions } from '../config/navigation'
import { NotificationProvider } from '../contexts/NotificationContext'

export default function RootLayout() {
	const stackOptions = getPlatformStackOptions({
		headerShown: false
	})

	return (
		<ThemeProvider>
			<NotificationProvider>
				<Stack screenOptions={stackOptions} />
			</NotificationProvider>
		</ThemeProvider>
	)
}
