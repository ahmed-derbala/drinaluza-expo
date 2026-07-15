import { useCallback } from 'react'
import { useCacheFirst } from '@/core/hooks/useCacheFirst'
import { getProducts } from './products.api'
import { ProductsResponse } from './products.api'

export interface UseProductsOptions {
	ttlMs?: number
	skipInitialFetch?: boolean
}

export const useProducts = (options: UseProductsOptions = {}) => {
	const { ttlMs, skipInitialFetch } = options
	const cacheKey = 'products:all:page1'

	const fetchFn = useCallback(async () => {
		return await getProducts(1, 10)
	}, [])

	return useCacheFirst<ProductsResponse>({
		cacheKey,
		fetchFn,
		ttlMs,
		skipInitialFetch
	})
}

export default useProducts
