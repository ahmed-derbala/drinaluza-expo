import { Stack } from 'expo-router'
import React from 'react'
import { ThemeProvider } from '../contexts/ThemeContext'
import AuthRequiredModal from '../components/common/AuthRequiredModal'
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
				<AuthRequiredModal />
			</NotificationProvider>
		</ThemeProvider>
	)
}
