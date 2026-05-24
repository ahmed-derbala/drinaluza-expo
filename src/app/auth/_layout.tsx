import React from 'react'
import { Stack } from 'expo-router'
import { useTheme } from '@/core/theme'
import { getPlatformStackOptions, withThemedHeader } from '@/config/navigation'

export default function AuthLayout() {
	return <Stack screenOptions={{ headerShown: false }} />
}
