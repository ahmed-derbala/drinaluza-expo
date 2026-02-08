import React from 'react'
import { Stack } from 'expo-router'
import { useTheme } from '@/core/contexts/ThemeContext'
import { getPlatformStackOptions, withThemedHeader } from '../../config/navigation'

export default function AuthLayout() {
	const { colors } = useTheme()
	const stackOptions = getPlatformStackOptions(
		withThemedHeader(colors, {
			headerShown: false,
			headerTitleStyle: {
				fontWeight: 'bold'
			}
		})
	)

	return <Stack screenOptions={stackOptions} />
}
