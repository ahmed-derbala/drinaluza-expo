import { useCallback, useMemo, useState } from 'react'
import { Alert } from 'react-native'

import { getItem, setItem } from '@storage'
import { log } from '@log'
import { createPurchase } from '@orders/orders.api'
import { getProductBySlug } from '@products/products.api'
import { getBusinessBySlug } from '@businesses/businesses.api'
import { useUser } from '@contexts'
import { FeedItem } from '@feed/feed.interface'

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
	const [isRefreshing, setIsRefreshing] = useState(false)

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

	const refreshCart = useCallback(async () => {
		setIsRefreshing(true)
		try {
			const currentCart = (await getItem<CartItem[]>('cart')) || []
			if (currentCart.length === 0) return

			const productSlugs = new Set<string>()
			const businessSlugs = new Set<string>()
			for (const item of currentCart) {
				if (item.slug) productSlugs.add(item.slug)
				if (item.business?.slug) businessSlugs.add(item.business.slug)
			}

			const [productResults, businessResults] = await Promise.all([
				Promise.all(
					Array.from(productSlugs).map(async (slug) => {
						try {
							const res = await getProductBySlug(slug)
							return { slug, data: res.data }
						} catch (err) {
							log({ level: 'error', label: 'useCart', message: `Failed to refresh product ${slug}`, error: err })
							return { slug, data: null }
						}
					})
				),
				Promise.all(
					Array.from(businessSlugs).map(async (slug) => {
						try {
							const res = await getBusinessBySlug(slug)
							return { slug, data: res.data }
						} catch (err) {
							log({ level: 'error', label: 'useCart', message: `Failed to refresh business ${slug}`, error: err })
							return { slug, data: null }
						}
					})
				)
			])

			const productBySlug = new Map<string, any>()
			productResults.forEach((r) => {
				if (r.data) productBySlug.set(r.slug, r.data)
			})

			const businessBySlug = new Map<string, any>()
			businessResults.forEach((r) => {
				if (r.data) businessBySlug.set(r.slug, r.data)
			})

			const nextCart = currentCart.map((item) => {
				const product = productBySlug.get(item.slug)
				const businessSlug = item.business?.slug
				const business = businessSlug ? businessBySlug.get(businessSlug) : undefined
				if (!product && !business) return item

				const updates: any = {}
				if (product) Object.assign(updates, product)
				if (business) updates.business = business

				return {
					...item,
					...updates,
					_id: product?._id || item._id,
					quantity: item.quantity
				}
			})

			setCart(nextCart)
			await setItem('cart', nextCart)
		} finally {
			setIsRefreshing(false)
		}
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
		refreshCart,
		updateQuantity,
		removeItem,
		checkout,
		isCheckingOut,
		isRefreshing
	}
}
