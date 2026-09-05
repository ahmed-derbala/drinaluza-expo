import { useCallback, useEffect, useState } from 'react'
import { getCacheItem, setCacheItem } from '@cache'
import { getItem } from '@storage'
import { useUser } from '@contexts'
import { OrderResponse } from '@orders/orders.interface'
export function usePurchaseCounts() {
	const { user } = useUser()
	const cacheKey = user?._id ? `purchase-counts:${user._id}` : 'purchase-counts:anonymous'
	const [counts, setCounts] = useState<Record<string, number>>({})
	const [isLoading, setIsLoading] = useState(false)
	useEffect(() => {
		getCacheItem<Record<string, number>>(cacheKey)
			.then((cached) => {
				if (cached?.data) setCounts((prev) => ({ ...cached.data, ...prev }))
			})
			.catch((err) => console.error('Error loading purchase counts cache:', err))
	}, [cacheKey])
	const refresh = useCallback(
		async (user: any, allPurchases?: OrderResponse) => {
			let allCount: number | undefined
			if (allPurchases?.data) {
				allCount = allPurchases.data.pagination?.totalDocs ?? allPurchases.data.docs.length
			}
			let cartCount = 0
			try {
				const storedCart = await getItem<{ _id: string }[]>('cart')
				cartCount = storedCart?.length || 0
			} catch (err) {
				console.error('Error loading cart count:', err)
			}
			setCounts((prev) => {
				const next = {
					...prev,
					...(allCount !== undefined ? { all: allCount } : {}),
					cart: cartCount
				}
				setCacheItem(cacheKey, next).catch((err) => console.error('Error saving purchase counts cache:', err))
				return next
			})
		},
		[cacheKey]
	)
	const setStatusCount = useCallback(
		(status: string, response: OrderResponse) => {
			const count = response.data.pagination?.totalDocs ?? response.data.docs.length
			setCounts((prev) => {
				const next = { ...prev, [status]: count }
				setCacheItem(cacheKey, next).catch((err) => console.error('Error saving purchase counts cache:', err))
				return next
			})
		},
		[cacheKey]
	)
	return { counts, refresh, setStatusCount, isLoading }
}
