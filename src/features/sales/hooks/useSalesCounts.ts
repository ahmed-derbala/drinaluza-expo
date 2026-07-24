import { useCallback, useState } from 'react'

import { getSales } from '@/features/sales/sales.api'

export function useSalesCounts() {
	const [counts, setCounts] = useState<Record<string, number>>({})
	const [isLoading, setIsLoading] = useState(false)

	const refresh = useCallback(async (businessSlug?: string, customerSlug?: string, productSlug?: string) => {
		if (!businessSlug) return
		setIsLoading(true)
		try {
			const response = await getSales(businessSlug, 1, 1000, undefined, customerSlug, productSlug)
			if (response?.data?.docs) {
				const all = response.data.docs
				const next: Record<string, number> = {
					all: response.data.pagination?.totalDocs || all.length
				}
				all.forEach((sale) => {
					next[sale.status] = (next[sale.status] || 0) + 1
				})
				setCounts(next)
			}
		} catch (err) {
			console.error('Error loading sales counts:', err)
		} finally {
			setIsLoading(false)
		}
	}, [])

	return { counts, refresh, isLoading }
}
