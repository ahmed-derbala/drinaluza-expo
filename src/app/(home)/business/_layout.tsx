import React from 'react'
import { Stack } from 'expo-router'
import { useTheme } from '@/core/contexts/ThemeContext'
import { getPlatformStackOptions, withThemedHeader } from '@/config/navigation'
import { useAuthGuard } from '@/core/auth/useAuthGuard'
import { NavigationGuard } from '@/core/helpers/NavigationGuard'

export default function BusinessOwnerLayout() {
	const { colors } = useTheme()
	const { isLoading, userRole } = useAuthGuard({
		requireAuth: true,
		allowedRoles: ['shop_owner'],
		redirectTo: '/auth'
	})

	const stackOptions = getPlatformStackOptions(
		withThemedHeader(colors, {
			contentStyle: {
				backgroundColor: colors.background
			}
		})
	)

	return (
		<NavigationGuard isLoading={isLoading} accessDenied={userRole !== 'shop_owner' && !isLoading} accessDeniedMessage="Access Denied. This section is only available for business owners.">
			<Stack screenOptions={stackOptions}>
				<Stack.Screen name="my-businesses" options={{ headerShown: false }} />
				<Stack.Screen name="my-products" options={{ headerShown: false }} />
				<Stack.Screen name="sales" options={{ title: 'Sales', headerShown: false }} />
				<Stack.Screen name="create-product" options={{ headerShown: false }} />
				<Stack.Screen name="[businessSlug]" options={{ headerShown: false }} />
			</Stack>
		</NavigationGuard>
	)
}
