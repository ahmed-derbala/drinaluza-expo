import { useCallback, useMemo, useState } from 'react'
import { Alert } from 'react-native'

import { getItem, setItem } from '@/core/storage'
import { createPurchase } from '@/features/orders/orders.api'
import { useUser } from '@/core/contexts'
import { FeedItem } from '@/features/feed/feed.interface'

export type CartItem = FeedItem & { quantity: number }

export interface BusinessCartGroup {
	businessId: string
	businessName: string
	businessSlug: string
	items: CartItem[]
}

export function useCart() {
	const { translate, localize } = useUser()
	const [cart, setCart] = useState<CartItem[]>([])
	const [isCheckingOut, setIsCheckingOut] = useState(false)

	const cartGroups = useMemo<BusinessCartGroup[]>(() => {
		const groupsMap = new Map<string, BusinessCartGroup>()
		cart.forEach((item) => {
			const bId = item.business?._id || 'unknown'
			const bName = localize(item.business?.name) || 'Unknown Store'
			const bSlug = item.business?.slug || ''

			if (!groupsMap.has(bId)) {
				groupsMap.set(bId, {
					businessId: bId,
					businessName: bName,
					businessSlug: bSlug,
					items: []
				})
			}
			groupsMap.get(bId)!.items.push(item)
		})
		return Array.from(groupsMap.values())
	}, [cart, localize])

	const loadCart = useCallback(async () => {
		const storedCart = await getItem<CartItem[]>('cart')
		setCart(storedCart || [])
	}, [])

	const updateCart = useCallback(async (nextCart: CartItem[]) => {
		setCart(nextCart)
		await setItem('cart', nextCart)
	}, [])

	const updateQuantity = useCallback(
		async (itemId: string, newQuantity: number) => {
			if (newQuantity < 1) {
				Alert.alert(translate('remove_item', 'Remove Item'), translate('remove_item_confirm', 'Do you want to remove this item from your cart?'), [
					{ text: translate('cancel', 'Cancel'), style: 'cancel' },
					{
						text: translate('confirm', 'Confirm'),
						style: 'destructive',
						onPress: () => {
							const next = cart.filter((item) => item._id !== itemId)
							updateCart(next)
						}
					}
				])
				return
			}

			const next = cart.map((item) => (item._id === itemId ? { ...item, quantity: newQuantity } : item))
			updateCart(next)
		},
		[cart, translate, updateCart]
	)

	const removeItem = useCallback(
		async (itemId: string) => {
			const next = cart.filter((item) => item._id !== itemId)
			updateCart(next)
		},
		[cart, updateCart]
	)

	const checkout = useCallback(
		async (group: BusinessCartGroup) => {
			setIsCheckingOut(true)
			try {
				const products = group.items.map((item) => ({
					product: { _id: item._id, slug: item.slug },
					quantity: item.quantity
				}))

				await createPurchase({
					products,
					business: { slug: group.businessSlug, _id: group.businessId }
				})

				const purchasedIds = new Set(group.items.map((item) => item._id))
				const next = cart.filter((item) => !purchasedIds.has(item._id))
				await updateCart(next)

				return { success: true }
			} finally {
				setIsCheckingOut(false)
			}
		},
		[cart, updateCart]
	)

	return {
		cart,
		cartGroups,
		loadCart,
		updateQuantity,
		removeItem,
		checkout,
		isCheckingOut
	}
}
