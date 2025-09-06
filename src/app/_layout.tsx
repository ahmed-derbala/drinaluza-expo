import { Slot } from 'expo-router'
import React from 'react'
import { ThemeProvider } from '@/contexts/ThemeContext'

export default function RootLayout() {
	return (
		<ThemeProvider>
			<Slot />
		</ThemeProvider>
	)
}
