import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useTheme } from '../../../../contexts/ThemeContext'
import ScreenHeader from '../../../../components/common/ScreenHeader'
import { getSale } from '../../../../components/orders/orders.api'
import { Ionicons } from '@expo/vector-icons'

export default function SaleDetailsPage() {
	const { colors } = useTheme()
	const router = useRouter()
	const params: any = useLocalSearchParams()
	const saleId = params.saleId as string
	const [sale, setSale] = useState<any>(null)
	const [loading, setLoading] = useState(true)

	const load = async () => {
		setLoading(true)
		try {
			const data = await getSale(saleId)
			// API might wrap data inside `data` property
			setSale(data?.data || data)
		} catch (e) {
			console.error('Failed loading sale', e)
		}
		setLoading(false)
	}

	useEffect(() => {
		load()
	}, [saleId])

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<ScreenHeader title={`Sale ${saleId?.slice(-6)?.toUpperCase()}`} />
			<ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />} contentContainerStyle={{ padding: 16 }}>
				{sale ? (
					<View>
						<Text style={{ color: colors.text, fontWeight: '700', fontSize: 18, marginBottom: 8 }}>{sale.customer?.name || sale.customer?.slug || 'Customer'}</Text>
						<Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Status: {sale.status}</Text>
						<Text style={{ color: colors.primary, fontWeight: '800', fontSize: 20, marginBottom: 12 }}>
							{sale.price?.total ? (sale.price.total.tnd ? `${sale.price.total.tnd.toFixed(3)} TND` : JSON.stringify(sale.price.total)) : '—'}
						</Text>

						{sale.products?.map((p: any, i: number) => (
							<View key={i} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.textTertiary + '22' }}>
								<Text style={{ color: colors.text, fontWeight: '600' }}>{p.product?.defaultProduct?.name?.en || p.product?.name?.en || p.product?.name || 'Product'}</Text>
								<Text style={{ color: colors.textSecondary }}>
									{p.quantity} × {p.product?.price?.total?.tnd ? `${p.product.price.total.tnd.toFixed(3)} TND` : ''}
								</Text>
							</View>
						))}

						<View style={{ marginTop: 16 }}>
							<TouchableOpacity onPress={() => router.back()} style={{ padding: 12, backgroundColor: colors.card, borderRadius: 8 }}>
								<Text style={{ color: colors.text }}>Go back</Text>
							</TouchableOpacity>
						</View>
					</View>
				) : (
					<View style={{ padding: 24 }}>
						<Text style={{ color: colors.textSecondary }}>Sale not found.</Text>
					</View>
				)}
			</ScrollView>
		</View>
	)
}
