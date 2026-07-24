import { useCallback, useEffect, useMemo, useState } from 'react'

import { useSalesByStatus } from '../useSalesByStatus'
import { getSales, Sale } from '../sales.api'

const ITEMS_PER_PAGE = 10

interface UsePaginatedSalesOptions {
	businessSlug?: string
	customerSlug?: string
	productSlug?: string
	status?: string
}

export function usePaginatedSales({ businessSlug, customerSlug, productSlug, status }: UsePaginatedSalesOptions) {
	const {
		data: response,
		isInitialLoading,
		isRefreshing,
		isOffline,
		refresh
	} = useSalesByStatus({
		businessSlug,
		customerSlug,
		productSlug,
		status,
		skipInitialFetch: !businessSlug
	})

	const [extraSales, setExtraSales] = useState<Sale[]>([])
	const [currentPage, setCurrentPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)
	const [loadingMore, setLoadingMore] = useState(false)

	const page1Sales = response?.data?.docs ?? []

	useEffect(() => {
		setExtraSales([])
		setCurrentPage(1)
		setHasMore(true)
	}, [response])

	const loadMore = useCallback(async () => {
		if (!businessSlug || loadingMore || !hasMore) return
		const nextPage = currentPage + 1
		setLoadingMore(true)
		try {
			const res = await getSales(businessSlug, nextPage, ITEMS_PER_PAGE, status === 'all' ? undefined : status, customerSlug, productSlug)
			if (res?.data?.docs) {
				const docs = res.data.docs
				setExtraSales((prev) => [...prev, ...docs])
				setHasMore(docs.length === ITEMS_PER_PAGE && res.data.pagination?.hasNextPage !== false)
			} else {
				setHasMore(false)
			}
			setCurrentPage(nextPage)
		} catch (err) {
			console.error('Error loading more sales:', err)
		} finally {
			setLoadingMore(false)
		}
	}, [businessSlug, customerSlug, currentPage, hasMore, loadingMore, productSlug, status])

	const sales = useMemo(() => [...page1Sales, ...extraSales], [page1Sales, extraSales])

	return {
		sales,
		isInitialLoading,
		isRefreshing,
		isOffline,
		refresh,
		loadMore,
		loadingMore,
		hasMore
	}
}
