import { useCallback, useState } from 'react'

import { getItem } from '@/core/storage'
import { getPurchases } from '@/features/orders/orders.api'

export function usePurchaseCounts() {
	const [counts, setCounts] = useState<Record<string, number>>({ all: 0, cart: 0 })
	const [isLoading, setIsLoading] = useState(false)

	const refresh = useCallback(async (user: any) => {
		const next: Record<string, number> = { all: 0, cart: 0 }

		if (user) {
			setIsLoading(true)
			try {
				const response = await getPurchases()
				if (response?.data?.docs) {
					next.all = response.data.docs.length
					response.data.docs.forEach((item: any) => {
						next[item.status] = (next[item.status] || 0) + 1
					})
				}
			} catch (err) {
				console.error('Error loading purchase counts:', err)
			} finally {
				setIsLoading(false)
			}
		}

		try {
			const storedCart = await getItem<{ _id: string }[]>('cart')
			next.cart = storedCart?.length || 0
		} catch (err) {
			console.error('Error loading cart count:', err)
		}

		setCounts(next)
	}, [])

	return { counts, refresh, isLoading }
}
