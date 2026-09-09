import { useMemo, useCallback, useEffect, useRef } from 'react'
import { View, StyleSheet, Text, TouchableOpacity, useWindowDimensions } from 'react-native'
import { useFocusEffect, useLocalSearchParams, Stack, useRouter, useNavigation } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { HeaderRefreshButton, SmartHeader } from '@smart-header'
import { useTheme } from '@theme'
import { useBackButton } from '@hooks/useBackButton'

import ErrorBlock from '@error/ErrorBlock'
import Spinner from '@ui/spinner/Spinner'
import { ORDER_STATUSES, SALES_TABS, orderStatusIcons } from '@orders/orders-statuses'
import { SmartTabs, SmartTabOption } from '@smart-tabs'
import { OrderList } from '@orders/components/OrderList'
import SaleCard from './SaleCard'
import { Sale } from './sales.api'
import { usePaginatedSales } from './hooks/usePaginatedSales'
import { useSalesCounts } from './hooks/useSalesCounts'

const statusOptions: SmartTabOption[] = [
	{ value: SALES_TABS.NEW, label: 'New', iconName: 'sparkles-outline' },
	{ value: SALES_TABS.PREPARING, label: 'Preparing', iconName: orderStatusIcons[ORDER_STATUSES.PREPARING] },
	{ value: SALES_TABS.DISPATCH, label: 'Dispatch', iconName: 'send-outline' },
	{ value: SALES_TABS.HISTORY, label: 'History', iconName: 'archive-outline' }
]

export default function SalesScreen() {
	const { businessSlug, customerSlug, productSlug, tab } = useLocalSearchParams<{
		businessSlug: string
		customerSlug?: string
		productSlug?: string
		tab?: string
	}>()
	const router = useRouter()
	const navigation = useNavigation()
	const { colors } = useTheme()
	const { width } = useWindowDimensions()
	const selectedTab = useMemo(() => {
		const raw = Array.isArray(tab) ? tab[0] : tab
		return raw || SALES_TABS.NEW
	}, [tab])

	const setSelectedTab = useCallback(
		(value: string) => {
			router.setParams({ tab: value })
		},
		[router]
	)
	useBackButton()

	const numColumns = width >= 1024 ? 2 : 1

	const {
		counts: tabCounts,
		setTabCount,
		isLoading: countsLoading
	} = useSalesCounts({
		businessSlug,
		customerSlug,
		productSlug
	})

	const { sales, response, totalCount, isInitialLoading, isRefreshing, isOffline, refresh, loadMore, loadingMore } = usePaginatedSales({
		businessSlug,
		customerSlug,
		productSlug,
		tab: selectedTab
	})
	const hasFocusedRef = useRef(false)

	useEffect(() => {
		if (!businessSlug || !response) return
		setTabCount(selectedTab, response)
	}, [businessSlug, selectedTab, response, setTabCount])

	const handleRefresh = useCallback(async () => {
		const tabData = await refresh()
		if (tabData) setTabCount(selectedTab, tabData)
	}, [selectedTab, refresh, setTabCount])

	useFocusEffect(
		useCallback(() => {
			if (!hasFocusedRef.current) {
				hasFocusedRef.current = true
				return
			}
			refresh().then((tabData) => {
				if (tabData) setTabCount(selectedTab, tabData)
			})
		}, [selectedTab, refresh, setTabCount])
	)

	const renderItem = useCallback(
		({ item }: { item: Sale }) => (
			<View style={[numColumns > 1 ? styles.columnItem : styles.fullWidthItem, numColumns > 1 && { paddingHorizontal: 8, marginBottom: 16 }]}>
				<SaleCard sale={item} onStatusUpdate={handleRefresh} />
			</View>
		),
		[numColumns, handleRefresh]
	)

	const activeFiltersBanner = useMemo(() => {
		if (!customerSlug && !productSlug) return null
		return (
			<View style={[styles.activeFiltersBanner, { backgroundColor: colors.primaryContainer, borderColor: colors.primary }]}>
				<View style={styles.activeFiltersLeft}>
					<Ionicons name="funnel-outline" size={18} color={colors.primary} />
					<View style={{ flex: 1 }}>
						<Text style={[styles.activeFiltersTitle, { color: colors.text }]}>Filtered Sales</Text>
						<Text style={[styles.activeFiltersSubtitle, { color: colors.textSecondary }]}>
							Showing sales for {customerSlug ? `Customer: ${customerSlug}` : ''}
							{customerSlug && productSlug ? ' • ' : ''}
							{productSlug ? `Product: ${productSlug}` : ''}
						</Text>
					</View>
				</View>
				<TouchableOpacity onPress={() => router.setParams({ customerSlug: '', productSlug: '' })} style={[styles.clearFilterBtn, { backgroundColor: colors.surface }]} activeOpacity={0.7}>
					<Ionicons name="close" size={16} color={colors.primary} />
					<Text style={[styles.clearFilterText, { color: colors.primary }]}>Clear</Text>
				</TouchableOpacity>
			</View>
		)
	}, [colors, customerSlug, productSlug, router])

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen options={{ headerShown: false }} />

			<SmartHeader
				navigation={navigation}
				title="Sales"
				subtitle={businessSlug || undefined}
				back={navigation.canGoBack() ? { title: 'Back' } : undefined}
				headerBottomHeight={52}
				options={{ onRefresh: handleRefresh, isRefreshing: isRefreshing || countsLoading }}
				headerActions={[<HeaderRefreshButton key="refresh" onRefresh={handleRefresh} isRefreshing={isRefreshing || countsLoading} />]}
				headerBottom={
					<SmartTabs
						value={selectedTab}
						onChange={setSelectedTab}
						options={statusOptions}
						counts={tabCounts}
						activeCount={totalCount}
						resetKey={[businessSlug, customerSlug, productSlug].filter(Boolean).join('-')}
						loading={isRefreshing || countsLoading}
					/>
				}
			/>

			{isOffline && sales.length === 0 ? (
				<ErrorBlock />
			) : isInitialLoading ? (
				<Spinner />
			) : (
				<OrderList
					data={sales}
					renderItem={renderItem}
					keyExtractor={(item) => item._id}
					numColumns={numColumns}
					isRefreshing={isRefreshing}
					onRefresh={handleRefresh}
					onEndReached={loadMore}
					loadingMore={loadingMore}
					ListHeaderComponent={activeFiltersBanner}
					contentContainerStyle={[styles.listContent, numColumns > 1 && { paddingHorizontal: 8 }]}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	loadingOverlay: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	listContent: {
		padding: 16,
		flexGrow: 1
	},
	columnItem: {
		flex: 1,
		minWidth: 0
	},
	fullWidthItem: {
		width: '100%'
	},
	activeFiltersBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		marginHorizontal: 16,
		marginTop: 14,
		marginBottom: 12,
		borderRadius: 14,
		borderWidth: 1.5,
		gap: 12
	},
	activeFiltersLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		flex: 1
	},
	activeFiltersTitle: {
		fontSize: 14,
		fontWeight: '700',
		letterSpacing: -0.2
	},
	activeFiltersSubtitle: {
		fontSize: 12,
		marginTop: 2
	},
	clearFilterBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		gap: 4,
		borderWidth: 1,
		borderColor: 'transparent'
	},
	clearFilterText: {
		fontSize: 12,
		fontWeight: '700'
	}
})
