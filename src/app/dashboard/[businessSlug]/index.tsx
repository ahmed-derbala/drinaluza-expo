import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import BusinessDashboardScreen from '@/features/dashboard/BusinessDashboardScreen'

export default function BusinessDashboardRoute() {
	const { businessSlug } = useLocalSearchParams<{ businessSlug: string }>()
	if (!businessSlug) return null
	return <BusinessDashboardScreen key={businessSlug} businessSlug={businessSlug} />
}
