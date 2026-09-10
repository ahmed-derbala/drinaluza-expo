import { config } from '@/config'
import { HeaderRefreshButton, HeaderQRCodeButton, SmartHeader } from '@smart-header'
import React, { useState, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, Stack } from 'expo-router'
import QRCodeModal from '@ui/qrcode/QRCodeModal'
import Spinner from '@ui/spinner/Spinner'
import { useBusinessBySlug } from '@businesses/useBusinessBySlug'
import { useBusinessProducts } from '@businesses/useBusinessProducts'
import { ProductType } from '@products/products.type'
import { useTheme } from '@theme'
import ErrorBlock from '@error/ErrorBlock'
import { useUser } from '@contexts/UserContext'
import { useScrollHandler } from '@scroll'
import ReviewSection from '@reviews/Reviews'
import BusinessHeaderCard from '@businesses/BusinessHeaderCard'
import BusinessProductsCard from '@businesses/BusinessProductsCard'
import type { Business } from './businesses.interface'
export default function BusinessScreen() {
	const { businessSlug } = useLocalSearchParams<{ businessSlug: string }>()
	const { colors } = useTheme()
	const { localize, translate } = useUser()
	const insets = useSafeAreaInsets()
	const styles = useMemo(() => createStyles(), [])
	const {
		data: businessResponse,
		isInitialLoading: businessLoading,
		isRefreshing: businessRefreshing,
		isOffline: businessOffline,
		refresh: refreshBusiness,
		updateCache: updateBusinessCache
	} = useBusinessBySlug({ businessSlug })
	const business = businessResponse?.data ?? null
	const canEditBusiness = businessResponse?.viewer ? businessResponse.viewer.canEdit === true : false
	const { data: productsResponse, isInitialLoading: productsLoading, isRefreshing: productsRefreshing, isOffline: productsOffline, refresh: refreshProducts } = useBusinessProducts({ businessSlug })
	const products = (productsResponse?.data?.docs ?? []) as unknown as ProductType[]
	const { onScroll } = useScrollHandler()
	const isInitialLoading = businessLoading || productsLoading
	const isRefreshing = businessRefreshing || productsRefreshing
	const isOffline = businessOffline && productsOffline
	const displayTitle = business ? localize(business.name) : ''
	const [showQRCode, setShowQRCode] = useState(false)
	const handleRefresh = useCallback(() => {
		refreshBusiness()
		refreshProducts()
	}, [refreshBusiness, refreshProducts])
	const handleShowQRCode = useCallback(() => setShowQRCode(true), [])
	const handleBusinessSaved = useCallback(
		(next: Business) => {
			if (businessResponse) {
				updateBusinessCache({ ...businessResponse, data: next })
			} else {
				refreshBusiness()
			}
		},
		[businessResponse, updateBusinessCache, refreshBusiness]
	)
	const headerActions = useMemo(
		() => [<HeaderQRCodeButton key="qr-code" onPress={handleShowQRCode} />, <HeaderRefreshButton key="refresh" onRefresh={handleRefresh} isRefreshing={isRefreshing} />],
		[handleShowQRCode, handleRefresh, isRefreshing]
	)
	if (isInitialLoading) {
		return (
			<View style={styles.container}>
				<Stack.Screen
					options={
						{
							title: displayTitle,
							subtitle: `${businessSlug}`
						} as any
					}
				/>
				<Spinner />
			</View>
		)
	}
	if (isOffline && !business) {
		return (
			<View style={styles.container}>
				<Stack.Screen options={{ title: translate('error', 'Error') }} />
				<SmartHeader title={translate('error', 'Error')} fallbackRoute="/(home)/feed" />
				<View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
					<ErrorBlock />
				</View>
			</View>
		)
	}
	if (!business) {
		return (
			<View style={styles.container}>
				<Stack.Screen options={{ title: displayTitle }} />
				<View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
					<Text style={[styles.errorText, { color: colors.text }]}>{translate('business_not_found', 'Business not found')}</Text>
				</View>
			</View>
		)
	}
	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen
				options={
					{
						title: displayTitle,
						subtitle: `${business.slug}`,
						fallbackRoute: '/(home)/feed',
						headerActions: headerActions
					} as any
				}
			/>
			<SmartHeader.ScrollView
				style={styles.container}
				contentContainerStyle={[styles.scrollContent, { paddingTop: 12, paddingBottom: 40 + insets.bottom }]}
				refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
				onScroll={onScroll}
				scrollEventThrottle={16}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<BusinessHeaderCard business={business} canEdit={canEditBusiness} onSaved={handleBusinessSaved} />
				{/* Products Section */}
				<BusinessProductsCard products={products} />
				{/* Reviews Section */}
				{business && <ReviewSection targetResource="businesses" targetId={business._id} targetName={localize(business.name)} />}
			</SmartHeader.ScrollView>
			{/* QR Code Viewer Modal */}
			{business && (
				<QRCodeModal
					visible={showQRCode}
					onClose={() => setShowQRCode(false)}
					value={`${config.frontend.url}/b/${business.slug}`}
					title={localize(business.name)}
					subtitle={`${business.slug}`}
					filenamePrefix={`business_${business.slug}`}
				/>
			)}
		</View>
	)
}
const createStyles = () =>
	StyleSheet.create({
		container: {
			flex: 1
		},
		errorContainer: {
			flex: 1,
			padding: 20
		},
		scrollContent: {
			padding: 20,
			paddingBottom: 40
		},
		errorText: {
			fontSize: 16,
			textAlign: 'center',
			padding: 20
		}
	})
