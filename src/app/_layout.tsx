import { Slot } from 'expo-router'
import { useEffect } from 'react'
import { Appearance } from 'react-native'
import { getTheme } from '@/components/settings/settings.api'
import React from 'react'

export default function RootLayout() {
	useEffect(() => {
		const initializeTheme = async () => {
			const theme = await getTheme()
			if (theme === 'system') {
				const systemTheme = Appearance.getColorScheme()
				// Apply system theme
			} else {
				// Apply stored theme
			}
		}
		initializeTheme()
	}, [])

	return <Slot />
}
