import { useCallback, useEffect, useMemo, useState } from 'react'

import { useSalesByStatus } from '@sales/useSalesByStatus'
import { getSales, Sale } from '@sales/sales.api'

const ITEMS_PER_PAGE = 10

interface UsePaginatedSalesOptions {
	businessSlug?: string
	customerSlug?: string
	productSlug?: string
	tab?: string
}

export function usePaginatedSales({ businessSlug, customerSlug, productSlug, tab }: UsePaginatedSalesOptions) {
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
		tab,
		skipInitialFetch: !businessSlug
	})

	const [extraSales, setExtraSales] = useState<Sale[]>([])
	const [currentPage, setCurrentPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)
	const [loadingMore, setLoadingMore] = useState(false)

	const page1Sales = response?.data?.docs ?? []
	const totalCount = response?.data?.pagination?.totalDocs

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
			const res = await getSales(businessSlug, nextPage, ITEMS_PER_PAGE, tab, customerSlug, productSlug)
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
	}, [businessSlug, customerSlug, currentPage, hasMore, loadingMore, productSlug, tab])

	const sales = useMemo(() => [...page1Sales, ...extraSales], [page1Sales, extraSales])

	return {
		sales,
		response,
		totalCount,
		isInitialLoading,
		isRefreshing,
		isOffline,
		refresh,
		loadMore,
		loadingMore,
		hasMore
	}
}
