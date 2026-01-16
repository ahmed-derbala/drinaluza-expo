import React from 'react'
import { Stack } from 'expo-router'
import { useTheme } from '../../../contexts/ThemeContext'
import { getPlatformStackOptions, withThemedHeader } from '../../../config/navigation'
import { useAuthGuard } from '../../../hooks/useAuthGuard'
import { NavigationGuard } from '../../../components/NavigationGuard'

export default function BusinessLayout() {
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
		<NavigationGuard isLoading={isLoading} accessDenied={userRole !== 'shop_owner' && !isLoading} accessDeniedMessage="Access Denied. This section is only available for shop owners.">
			<Stack screenOptions={stackOptions}>
				<Stack.Screen
					name="index"
					options={{
						title: 'Business Dashboard',
						headerShown: false
					}}
				/>
				<Stack.Screen
					name="my-shops"
					options={{
						headerShown: false
					}}
				/>
				<Stack.Screen
					name="my-products"
					options={{
						headerShown: false
					}}
				/>
				<Stack.Screen
					name="sales"
					options={{
						title: 'Sales',
						headerShown: false
					}}
				/>
				<Stack.Screen
					name="create-product"
					options={{
						headerShown: false
					}}
				/>
				<Stack.Screen
					name="shops/[shopSlug]"
					options={{
						headerShown: false
					}}
				/>
			</Stack>
		</NavigationGuard>
	)
}
