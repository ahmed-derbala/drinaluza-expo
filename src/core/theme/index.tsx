import React from 'react'
import { Stack } from 'expo-router'
import { ThemeProvider } from '@/contexts/ThemeContext'

export default function RootLayout() {
	return (
		<ThemeProvider>
			<Stack>
				<Stack.Screen name="auth" options={{ headerShown: false }} />
				<Stack.Screen name="home" options={{ headerShown: false }} />
			</Stack>
		</ThemeProvider>
	)
}
