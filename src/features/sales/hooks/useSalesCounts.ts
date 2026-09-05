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
	const refresh = useCallback(
		async (allSales?: SalesResponse) => {
			if (!businessSlug) return
			let allCount: number | undefined
			if (allSales?.data) {
				allCount = allSales.data.pagination?.totalDocs ?? allSales.data.docs.length
			}
			if (allCount !== undefined) {
				setCounts((prev) => {
					const next = { ...prev, all: allCount as number }
					setCacheItem(cacheKey, next).catch((err) => console.error('Error saving sales counts cache:', err))
					return next
				})
			}
		},
		[businessSlug, customerSlug, productSlug, cacheKey]
	)
	const setStatusCount = useCallback(
		(status: string, response: SalesResponse) => {
			const count = response.data.pagination?.totalDocs ?? response.data.docs.length
			setCounts((prev) => {
				const next = { ...prev, [status]: count }
				setCacheItem(cacheKey, next).catch((err) => console.error('Error saving sales counts cache:', err))
				return next
			})
		},
		[cacheKey]
	)
	return { counts, refresh, setStatusCount, isLoading }
}
