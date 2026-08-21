import React, { useCallback, useState } from 'react'
import { View, StyleSheet, RefreshControl } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import { SmartHeader } from '@/core/smart-header'
import { HeaderSalesButton } from '@/core/smart-header/buttons'
import { getSaleById, Sale } from './sales.api'
import SaleCard from './SaleCard'
import Spinner from '@/features/common/Spinner'
import ErrorBlock from '@/core/error/ErrorBlock'

export default function SaleDetailsScreen() {
	const { businessSlug, saleId } = useLocalSearchParams<{ businessSlug: string; saleId: string }>()
	const { colors } = useTheme()
	const { translate } = useUser()
	const insets = useSafeAreaInsets()

	const [sale, setSale] = useState<Sale | null>(null)
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState(false)

	const fetchSale = useCallback(
		async (showSpinner = true) => {
			if (!saleId) return
			if (showSpinner) setLoading(true)
			setError(false)
			try {
				const response = await getSaleById(saleId)
				setSale(response.data)
			} catch (err) {
				console.error('Failed to load sale details', err)
				setError(true)
			} finally {
				setLoading(false)
				setRefreshing(false)
			}
		},
		[saleId]
	)

	useFocusEffect(
		useCallback(() => {
			fetchSale(true)
		}, [fetchSale])
	)

	const onRefresh = useCallback(() => {
		setRefreshing(true)
		fetchSale(false)
	}, [fetchSale])

	if (loading) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}>
				<Stack.Screen options={{ title: translate('sale_details', 'Sale Details') }} />
				<Spinner />
			</View>
		)
	}

	if (error || !sale) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}>
				<Stack.Screen options={{ title: translate('error', 'Error') }} />
				<SmartHeader title={translate('error', 'Error')} fallbackRoute={`/dashboard/${businessSlug}/sales` as any} />
				<ErrorBlock onRetry={() => fetchSale(true)} />
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen
				options={
					{
						title: translate('sale_details', 'Sale Details'),
						subtitle: sale._id,
						headerActions: [<HeaderSalesButton key="sales" businessSlug={businessSlug} label={translate('sales', 'Sales')} />]
					} as any
				}
			/>
			<SmartHeader.ScrollView
				style={styles.container}
				contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
			>
				<SaleCard sale={sale} onStatusUpdate={() => fetchSale(false)} />
			</SmartHeader.ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	scrollContent: {
		padding: 16,
		paddingTop: 16
	}
})
