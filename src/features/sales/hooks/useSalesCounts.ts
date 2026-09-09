import { useCallback, useEffect, useState } from 'react'
import { getCacheItem, setCacheItem } from '@cache'
import { SalesResponse } from '@sales/sales.api'
export interface UseSalesCountsOptions {
	businessSlug?: string
	customerSlug?: string
	productSlug?: string
}
export function useSalesCounts({ businessSlug, customerSlug, productSlug }: UseSalesCountsOptions = {}) {
	const cacheKey = `sales-counts:${businessSlug || 'anonymous'}:${customerSlug || ''}:${productSlug || ''}`
	const [counts, setCounts] = useState<Record<string, number>>({})
	const [isLoading, setIsLoading] = useState(false)
	useEffect(() => {
		getCacheItem<Record<string, number>>(cacheKey)
			.then((cached) => {
				if (cached?.data) setCounts((prev) => ({ ...cached.data, ...prev }))
			})
			.catch((err) => console.error('Error loading sales counts cache:', err))
	}, [cacheKey])
	const setTabCount = useCallback(
		(tab: string, response: SalesResponse) => {
			const count = response.data.pagination?.totalDocs ?? response.data.docs.length
			setCounts((prev) => {
				const next = { ...prev, [tab]: count }
				setCacheItem(cacheKey, next).catch((err) => console.error('Error saving sales counts cache:', err))
				return next
			})
		},
		[cacheKey]
	)
	return { counts, setTabCount, isLoading }
}
