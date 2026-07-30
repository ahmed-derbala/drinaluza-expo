import { useCallback, useState } from 'react'

import { getItem } from '@/core/storage'
import { getPurchases } from '@/features/orders/orders.api'
import { OrderResponse } from '@/features/orders/orders.interface'

export function usePurchaseCounts() {
	const [counts, setCounts] = useState<Record<string, number>>({})
	const [isLoading, setIsLoading] = useState(false)

	const refresh = useCallback(async (user: any, allPurchases?: OrderResponse) => {
		let allCount: number | undefined

		if (allPurchases?.data) {
			allCount = allPurchases.data.pagination?.totalDocs ?? allPurchases.data.docs.length
		} else if (user) {
			setIsLoading(true)
			try {
				const response = await getPurchases()
				allCount = response.data.pagination?.totalDocs ?? response.data.docs.length
			} catch (err) {
				console.error('Error loading purchase counts:', err)
			} finally {
				setIsLoading(false)
			}
		}

		let cartCount = 0
		try {
			const storedCart = await getItem<{ _id: string }[]>('cart')
			cartCount = storedCart?.length || 0
		} catch (err) {
			console.error('Error loading cart count:', err)
		}

		setCounts((prev) => ({
			...prev,
			...(allCount !== undefined ? { all: allCount } : {}),
			cart: cartCount
		}))
	}, [])

	const setStatusCount = useCallback((status: string, response: OrderResponse) => {
		const count = response.data.pagination?.totalDocs ?? response.data.docs.length
		setCounts((prev) => ({ ...prev, [status]: count }))
	}, [])

	return { counts, refresh, setStatusCount, isLoading }
}
