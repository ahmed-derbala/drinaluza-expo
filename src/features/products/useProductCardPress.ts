import { useRouter, usePathname } from 'expo-router'
import { getCacheItem, setCacheItem } from '@cache'
import { ProductFeedItem } from '@feed/feed.interface'

export function useProductCardPress(item: ProductFeedItem) {
	const router = useRouter()
	const pathname = usePathname()

	const handleBusinessPress = (e?: { stopPropagation?: () => void }) => {
		e?.stopPropagation?.()
		if (item.business?.slug) {
			router.push(`/businesses/${item.business.slug}` as any)
		}
	}

	const handleProductPress = () => {
		if (!item.slug) return

		const cacheKey = `product:${item.slug}`
		getCacheItem(cacheKey).then((existing) => {
			if (!existing) setCacheItem(cacheKey, { status: 200, data: item })
		})

		if (pathname.startsWith('/products') || pathname.includes('/feed') || pathname === '/') {
			router.push(`/products/${item.slug}` as any)
		} else if (item.business?.slug) {
			router.push(`/businesses/${item.business.slug}/products/${item.slug}` as any)
		}
	}

	return { handleBusinessPress, handleProductPress }
}
