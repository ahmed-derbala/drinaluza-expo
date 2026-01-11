import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { getMyShopBySlug } from '../../../../components/shops/shops.api'
import { Shop } from '../../../../components/shops/shops.interface'
import { useTheme } from '../../../../contexts/ThemeContext'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { parseError } from '../../../../utils/errorHandler'
import ErrorState from '../../../../components/common/ErrorState'
import ScreenHeader from '../../../../components/common/ScreenHeader'

export default function MyShopDetailsScreen() {
	const { shopSlug } = useLocalSearchParams<{ shopSlug: string }>()
	const router = useRouter()
	const { colors, isDark } = useTheme()
	const [shop, setShop] = useState<Shop | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)

	const loadShopDetails = async () => {
		if (!shopSlug) return

		try {
			setLoading(true)
			setError(null)
			const response = await getMyShopBySlug(shopSlug)
			setShop(response.data)
		} catch (err: any) {
			console.error('Failed to load my shop details:', err)
			const errorInfo = parseError(err)
			setError({
				title: errorInfo.title,
				message: errorInfo.message,
				type: errorInfo.type
			})
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		loadShopDetails()
	}, [shopSlug])

	if (loading) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	if (error) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<ScreenHeader title="Shop Details" showBack={true} />
				<ErrorState
					title={error.title}
					message={error.message}
					onRetry={loadShopDetails}
					icon={error.type === 'network' || error.type === 'timeout' ? 'cloud-offline-outline' : 'alert-circle-outline'}
				/>
			</View>
		)
	}

	if (!shop) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<ScreenHeader title="Shop Details" showBack={true} />
				<View style={styles.centerContent}>
					<Text style={[styles.errorText, { color: colors.text }]}>Shop not found</Text>
				</View>
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScreenHeader title={shop.name.en} subtitle="Manage Shop" showBack={true} />

			<ScrollView contentContainerStyle={styles.scrollContent}>
				{/* Shop Status Info */}
				<View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={styles.sectionHeader}>
						<MaterialIcons name="info-outline" size={20} color={colors.primary} />
						<Text style={[styles.sectionTitle, { color: colors.text }]}>Shop Information</Text>
					</View>

					<View style={styles.infoRow}>
						<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Status</Text>
						<View style={[styles.statusBadge, { backgroundColor: colors.primary + '20' }]}>
							<Text style={[styles.statusText, { color: colors.primary }]}>ACTIVE</Text>
						</View>
					</View>

					<View style={styles.infoRow}>
						<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>City</Text>
						<Text style={[styles.infoValue, { color: colors.text }]}>{shop.address?.city || 'N/A'}</Text>
					</View>

					<View style={styles.infoRow}>
						<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Address</Text>
						<Text style={[styles.infoValue, { color: colors.text }]}>{shop.address?.street || 'N/A'}</Text>
					</View>
				</View>

				{/* Quick Actions */}
				<View style={styles.actionsGrid}>
					<TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<View style={[styles.actionIconContainer, { backgroundColor: '#4CAF5020' }]}>
							<Ionicons name="add-circle-outline" size={24} color="#4CAF50" />
						</View>
						<Text style={[styles.actionText, { color: colors.text }]}>Add Product</Text>
					</TouchableOpacity>

					<TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<View style={[styles.actionIconContainer, { backgroundColor: '#2196F320' }]}>
							<Ionicons name="list-outline" size={24} color="#2196F3" />
						</View>
						<Text style={[styles.actionText, { color: colors.text }]}>Products</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	scrollContent: {
		padding: 16
	},
	centerContent: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	section: {
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		marginBottom: 16
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
		gap: 8
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700'
	},
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: 'rgba(150,150,150,0.1)'
	},
	infoLabel: {
		fontSize: 14,
		fontWeight: '500'
	},
	infoValue: {
		fontSize: 14,
		fontWeight: '600'
	},
	statusBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6
	},
	statusText: {
		fontSize: 12,
		fontWeight: '700'
	},
	errorText: {
		fontSize: 16,
		fontWeight: '600'
	},
	actionsGrid: {
		flexDirection: 'row',
		gap: 12
	},
	actionCard: {
		flex: 1,
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		alignItems: 'center',
		gap: 8
	},
	actionIconContainer: {
		width: 48,
		height: 48,
		borderRadius: 24,
		justifyContent: 'center',
		alignItems: 'center'
	},
	actionText: {
		fontSize: 13,
		fontWeight: '600'
	}
})
