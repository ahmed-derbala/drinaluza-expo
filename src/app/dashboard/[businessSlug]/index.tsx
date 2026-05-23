import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import Dashboard from '@/features/dashboard/Dashboard'

export default function BusinessDashboardRoute() {
	const { businessSlug } = useLocalSearchParams<{ businessSlug: string }>()
	if (!businessSlug) return null
	return <Dashboard key={businessSlug} profileKind="business" businessSlug={businessSlug} />
}
