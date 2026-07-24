import React, { useMemo } from 'react'
import { View, ActivityIndicator, RefreshControl } from 'react-native'

import { SmartHeader } from '@/core/smart-header'
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
	emptyTitle?: string
	emptySubtitle?: string
	emptyIcon?: string
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
	emptyTitle,
	emptySubtitle,
	emptyIcon = 'receipt-long',
	ListHeaderComponent,
	contentContainerStyle
}: OrderListProps<T>) {
	const { colors } = useTheme()

	const footer = useMemo(() => {
		if (!loadingMore) return null
		return (
			<View style={styles.loadingMore}>
				<ActivityIndicator size="small" color={colors.primary} />
			</View>
		)
	}, [loadingMore, colors.primary])

	return (
		<SmartHeader.FlashList
			data={data}
			renderItem={renderItem}
			keyExtractor={keyExtractor}
			key={numColumns}
			numColumns={numColumns}
			contentContainerStyle={contentContainerStyle}
			refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
			onEndReached={onEndReached}
			onEndReachedThreshold={0.5}
			ListFooterComponent={footer}
			ListHeaderComponent={ListHeaderComponent}
			ListEmptyComponent={<EmptyState title={emptyTitle} subtitle={emptySubtitle} iconName={emptyIcon} iconType="material" style={styles.empty} />}
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
