import { Stack } from 'expo-router'
import React from 'react'
import { ThemeProvider } from '../contexts/ThemeContext'
import AuthRequiredModal from '../components/common/AuthRequiredModal'
import { getPlatformStackOptions } from '../config/navigation'

export default function RootLayout() {
	const stackOptions = getPlatformStackOptions({
		headerShown: false
	})

	return (
		<ThemeProvider>
			<Stack screenOptions={stackOptions} />
			<AuthRequiredModal />
		</ThemeProvider>
	)
}
