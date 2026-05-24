import React from 'react'
import { Stack } from 'expo-router'
import { useTheme } from '@/core/theme'
import { getPlatformStackOptions, withThemedHeader } from '@/config/navigation'

export default function AuthLayout() {
	const { colors } = useTheme()
	const stackOptions = getPlatformStackOptions(
		withThemedHeader(colors, {
			headerTitleStyle: {
				fontWeight: 'bold'
			}
		})
	)

	return <Stack screenOptions={stackOptions} />
}
