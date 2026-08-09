import React from 'react'
import { useRouter } from 'expo-router'
import { HeaderIconButton } from './HeaderIconButton'

export interface HeaderSalesButtonProps {
	businessSlug?: string
	size?: number
	label?: string
}

export function HeaderSalesButton({ businessSlug, size = 38, label = 'Sales' }: HeaderSalesButtonProps) {
	const router = useRouter()

	if (!businessSlug) return null

	return <HeaderIconButton icon="trending-up" label={label} onPress={() => router.push(`/dashboard/${businessSlug}/sales` as any)} size={size} />
}
