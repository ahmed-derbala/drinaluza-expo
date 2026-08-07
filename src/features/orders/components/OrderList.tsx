import React, { useMemo, useCallback } from 'react'
import { View, RefreshControl } from 'react-native'

import { SmartHeader } from '@/core/smart-header'
import Spinner from '@/features/common/Spinner'
import { useTheme } from '@/core/theme'
import EmptyState from '@/features/common/EmptyState'

interface OrderListProps<T> {
	data: T[]
	renderItem: ({ item, index }: any) => React.ReactElement
	keyExtractor: (item: T) => string
	numColumns?: number
	isRefreshing: boolean
	onRefresh: () => void
	onEndReached?: () => void
	loadingMore?: boolean
	ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null
	contentContainerStyle?: any
}

export const OrderList = React.memo(function OrderList<T>({
	data,
	renderItem,
	keyExtractor,
	numColumns = 1,
	isRefreshing,
	onRefresh,
	onEndReached,
	loadingMore = false,
	ListHeaderComponent,
	contentContainerStyle
}: OrderListProps<T>) {
	const { colors } = useTheme()

	const footer = useMemo(() => {
		if (!loadingMore) return null
		return <Spinner size="small" expand={false} />
	}, [loadingMore])

	const empty = useMemo(() => <EmptyState style={styles.empty} />, [])

	return (
		<SmartHeader.FlashList
			data={data}
			renderItem={renderItem}
			keyExtractor={keyExtractor}
			key={numColumns}
			numColumns={numColumns}
			estimatedItemSize={180}
			contentContainerStyle={contentContainerStyle}
			refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
			onEndReached={onEndReached}
			onEndReachedThreshold={0.5}
			ListFooterComponent={footer}
			ListHeaderComponent={ListHeaderComponent}
			ListEmptyComponent={empty}
		/>
	)
}) as <T>(props: OrderListProps<T>) => React.ReactElement

const styles = {
	loadingMore: {
		paddingVertical: 20,
		alignItems: 'center' as const
	},
	empty: {
		minHeight: 300
	}
}
