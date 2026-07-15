import { useCallback } from 'react'
import { useCacheFirst } from '@/core/hooks/useCacheFirst'
import { getProductBySlug } from './products.api'
import { ProductType } from './products.type'

export interface ProductDetailResponse {
	status: number
	data: ProductType
	viewer?: { canEdit?: boolean; canCreate?: boolean }
}

export interface UseProductBySlugOptions {
	productSlug?: string
	ttlMs?: number
	skipInitialFetch?: boolean
}

export const useProductBySlug = (options: UseProductBySlugOptions) => {
	const { productSlug, ttlMs, skipInitialFetch } = options
	const cacheKey = productSlug ? `product:${productSlug}` : 'product:anonymous'

	const fetchFn = useCallback(async () => {
		if (!productSlug) throw new Error('No product slug provided')
		const response = await getProductBySlug(productSlug)
		return response as ProductDetailResponse
	}, [productSlug])

	return useCacheFirst<ProductDetailResponse>({
		cacheKey,
		fetchFn,
		ttlMs,
		skipInitialFetch: skipInitialFetch || !productSlug
	})
}

export default useProductBySlug
