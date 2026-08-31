import { HeaderRefreshButton, SmartHeader } from '@/core/smart-header'
import { useTheme } from '@/core/theme'
import { StyleSheet, View, RefreshControl, type ViewStyle } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { useCallback, useMemo } from 'react'
import ErrorBlock from '@/core/error/ErrorBlock'
import EmptyState from '@/features/common/EmptyState'
import Spinner from '@/features/common/Spinner'
import { useBusinesses } from '@/features/businesses/useBusinesses'
import { Business } from '@/features/businesses/businesses.interface'
import { useUser } from '@/core/contexts/UserContext'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import { useResponsiveGrid } from '@/core/hooks/useResponsiveGrid'
import BusinessCard from './BusinessCard'

export default function BusinessesListScreen() {
	const { colors } = useTheme()
	const { data: response, isInitialLoading, isRefreshing, isOffline, refresh } = useBusinesses()
	const businesses = response?.data?.docs || []
	const totalDocs = response?.data?.pagination?.totalDocs ?? businesses.length
	const { translate } = useUser()
	const { onScroll } = useScrollHandler()
	const { numColumns, gap, padding } = useResponsiveGrid()

	const handleRefresh = useCallback(() => {
		refresh()
	}, [refresh])

	const renderBusinessCard = useCallback(
		({ item }: { item: Business }) => (
			<View style={{ width: '100%', paddingHorizontal: numColumns > 1 ? gap / 2 : 0, marginBottom: gap }}>
				<BusinessCard business={item} />
			</View>
		),
		[numColumns, gap]
	)

	const renderEmpty = useCallback(() => {
		if (isOffline) return <ErrorBlock />
		return <EmptyState style={styles.emptyContainer as ViewStyle} />
	}, [isOffline])

	const headerActions = useMemo(() => [<HeaderRefreshButton key="refresh" onRefresh={handleRefresh} isRefreshing={isRefreshing} />], [handleRefresh, isRefreshing])

	if (isInitialLoading) {
		return <Spinner />
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen
				options={
					{
						title: translate('businesses', 'businesses'),
						subtitle: String(totalDocs),
						headerActions: headerActions
					} as any
				}
			/>
			<SmartHeader.FlashList
				key={`cols-${numColumns}`}
				data={businesses}
				renderItem={renderBusinessCard}
				keyExtractor={(item: Business) => item._id}
				estimatedItemSize={360}
				contentContainerStyle={[
					styles.listContent as ViewStyle,
					{ paddingHorizontal: numColumns > 1 ? padding - gap / 2 : padding },
					businesses.length === 0 && { flexGrow: 1, justifyContent: 'center' }
				]}
				numColumns={numColumns}
				ListEmptyComponent={renderEmpty}
				refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
				onScroll={onScroll}
				scrollEventThrottle={16}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	listContent: {
		flexGrow: 1,
		paddingTop: 12,
		paddingBottom: 24
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24
	}
})
