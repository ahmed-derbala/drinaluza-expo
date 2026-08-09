import { HeaderRefreshButton, SmartHeader } from '@/core/smart-header'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, colors as themeColors } from '@/core/theme'
import { useWindowDimensions } from 'react-native'
import { StyleSheet, View, TouchableOpacity, RefreshControl, Linking, ViewStyle, ImageStyle, Platform } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import ErrorState from '@/features/common/ErrorState'
import EmptyState from '@/features/common/EmptyState'
import SmartImage from '@/core/SmartImageViewer'
import Spinner from '@/features/common/Spinner'
import { useBusinesses } from '@/features/businesses/useBusinesses'
import { showPopup, showAlert } from '@/core/helpers/popup'
import { Business } from '@/features/businesses/businesses.interface'
import { useUser } from '@/core/contexts/UserContext'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import BusinessCard from './BusinessCard'
// Common themed styles removed as they're not needed

// Responsive layout will be calculated inside the component

// Mock data removed in favor of real API

const createStyles = (
	colors: any,
	opts: {
		cardWidth: number
		numColumns: number
		padding: number
		fontSize: number
		subtitleFontSize: number
		smallFontSize: number
		imageHeight: number
		isCompact: boolean
		showExtended: boolean
		isExtraSmall: boolean
		isSmallScreen: boolean
		isMediumScreen: boolean
		isLargeScreen: boolean
		isExtraLarge: boolean
	}
) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: colors.background
		},
		headerSection: {
			padding: opts.isExtraSmall ? 12 : opts.isSmallScreen ? 16 : 20,
			paddingBottom: opts.isExtraSmall ? 12 : 16
		},
		headerTitle: {
			fontSize: opts.fontSize,
			fontWeight: '800',
			color: colors.text,
			marginBottom: 8,
			letterSpacing: -0.5
		},
		headerSubtitle: {
			fontSize: opts.subtitleFontSize,
			color: colors.textSecondary,
			letterSpacing: 0.1
		},
		listContent: {
			flexGrow: 1,
			padding: opts.padding,
			paddingBottom: 24,
			paddingTop: opts.isExtraSmall ? 4 : 8
		},
		businessCard: {
			flex: 1,
			margin: opts.isExtraSmall ? 4 : 6,
			borderRadius: opts.isExtraSmall ? 12 : 16,
			overflow: 'hidden',
			backgroundColor: colors.background,
			borderWidth: 1.5,
			borderColor: colors.info,
			width: opts.cardWidth - (opts.isExtraSmall ? 8 : 12), // Subtract margin from width
			maxWidth: opts.cardWidth - (opts.isExtraSmall ? 8 : 12),
			minHeight: opts.isExtraSmall ? 240 : 300,
			alignSelf: 'flex-start',
			flexDirection: 'column',
			justifyContent: 'space-between' as const
		},
		businessImageContainer: {
			position: 'relative',
			width: '100%',
			height: opts.imageHeight,
			backgroundColor: themeColors.buttonText5
		},
		imageOverlay: {
			position: 'absolute',
			left: 0,
			right: 0,
			bottom: 0,
			height: 64,
			backgroundColor: themeColors.background50
		},
		businessImage: {
			width: '100%',
			height: '100%'
		},
		businessCardContent: {
			flex: 1,
			padding: opts.isExtraSmall ? 10 : 16,
			justifyContent: 'space-between'
		},
		businessHeader: {
			marginBottom: opts.isExtraSmall ? 8 : 12
		},
		businessOwnerLabel: {
			fontSize: opts.smallFontSize,
			color: colors.textSecondary,
			marginBottom: 2,
			fontWeight: '500'
		},
		businessName: {
			fontSize: opts.fontSize,
			fontWeight: '700',
			color: colors.text,
			marginBottom: 4,
			lineHeight: opts.fontSize * 1.2
		},
		ownerName: {
			fontSize: opts.smallFontSize,
			color: colors.textTertiary,
			fontWeight: '500'
		},
		businessOwnerRow: {
			flexDirection: 'row',
			alignItems: 'center',
			marginBottom: 8
		},
		businessOwner: {
			fontSize: 14,
			color: colors.textSecondary,
			marginLeft: 6
		},
		businessBadge: {
			paddingHorizontal: 8,
			paddingVertical: 3,
			borderRadius: 6,
			backgroundColor: colors.primary + '15',
			marginLeft: 8
		},
		businessBadgeText: {
			fontSize: 11,
			fontWeight: '600',
			color: colors.primary
		},
		businessAddress: {
			fontSize: 13,
			color: colors.textTertiary,
			flexDirection: 'row',
			alignItems: 'center',
			marginTop: 4
		},
		// addressText is defined later in the styles
		businessFooter: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			marginTop: 12,
			paddingTop: 12,
			borderTopWidth: 1,
			borderTopColor: themeColors.buttonText10
		},
		businessStats: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 16
		},
		statItem: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 4
		},
		ratingContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8,
			marginBottom: 8
		},
		ratingBadge: {
			backgroundColor: colors.primary,
			borderRadius: 8,
			paddingHorizontal: 10,
			paddingVertical: 6,
			alignItems: 'center',
			flexDirection: 'row'
		},
		ratingText: {
			color: themeColors.buttonText,
			fontSize: 12,
			fontWeight: '600',
			marginRight: 6
		},
		ratingCount: {
			color: colors.textSecondary,
			fontSize: 12,
			marginLeft: 4
		},
		ratingStars: {
			color: themeColors.buttonText,
			fontSize: 14
		},
		reviewsContainer: {
			marginLeft: 8
		},
		reviewsText: {
			color: colors.textSecondary,
			fontSize: 12
		},
		categoryContainer: {
			flexDirection: 'row',
			flexWrap: 'wrap',
			gap: opts.isExtraSmall ? 4 : 6,
			marginBottom: opts.isExtraSmall ? 8 : 12
		},
		categoryChip: {
			backgroundColor: colors.backgroundSecondary,
			paddingHorizontal: opts.isExtraSmall ? 6 : 8,
			paddingVertical: opts.isExtraSmall ? 2 : 4,
			borderRadius: opts.isExtraSmall ? 8 : 12,
			borderWidth: 0.5,
			borderColor: colors.border
		},
		categoryText: {
			fontSize: opts.smallFontSize,
			color: colors.textSecondary,
			fontWeight: '500'
		},
		quickActions: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			marginTop: 12,
			gap: 8
		},
		quickActionButton: {
			backgroundColor: colors.primary,
			borderRadius: 10,
			paddingVertical: 8,
			paddingHorizontal: 12,
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center'
		},
		quickActionText: {
			color: themeColors.buttonText,
			fontSize: 14,
			fontWeight: '600',
			marginLeft: 8
		},
		quickActionSecondary: {
			backgroundColor: 'transparent',
			borderRadius: 10,
			paddingVertical: 8,
			paddingHorizontal: 12,
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			borderWidth: 1,
			borderColor: colors.border
		},
		quickActionSecondaryText: {
			color: colors.text,
			fontSize: 14,
			fontWeight: '600',
			marginLeft: 8
		},
		distanceContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			marginBottom: 4
		},
		distanceText: {
			color: colors.text,
			fontSize: 12,
			marginLeft: 4
		},
		distanceBadge: {
			backgroundColor: colors.primary,
			borderRadius: 8,
			paddingHorizontal: 8,
			paddingVertical: 4,
			alignItems: 'center'
		},
		deliveryBadge: {
			marginLeft: 8,
			backgroundColor: colors.primary + '10',
			borderRadius: 8,
			paddingHorizontal: 8,
			paddingVertical: 4
		},
		deliveryBadgeText: {
			color: colors.primary,
			fontSize: 12,
			fontWeight: '600'
		},
		distanceBadgeText: {
			color: themeColors.buttonText,
			fontSize: 12,
			fontWeight: '600'
		},
		hoursContainer: {
			backgroundColor: colors.background,
			borderRadius: 8,
			borderWidth: 1,
			borderColor: colors.info,
			padding: 12
		},
		hoursHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: 8
		},
		hoursIcon: {
			color: colors.primary
		},
		hoursText: {
			color: colors.text,
			fontSize: 12,
			fontWeight: '500'
		},
		hoursSecondaryText: {
			color: colors.textSecondary,
			fontSize: 10,
			marginLeft: 4
		},
		descriptionText: {
			color: colors.text,
			fontSize: 13,
			lineHeight: 18,
			marginTop: 8
		},
		button: {
			backgroundColor: colors.primary,
			borderRadius: 8,
			paddingVertical: 12,
			paddingHorizontal: 20,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center'
		},
		buttonText: {
			color: themeColors.buttonText
		},
		// Status and Business State Styles
		statusBadge: {
			position: 'absolute',
			top: 12,
			right: 12,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: 12,
			paddingHorizontal: 8,
			paddingVertical: 4,
			minWidth: 80
		},
		statusText: {
			color: themeColors.buttonText,
			fontSize: 12,
			fontWeight: '600',
			marginLeft: 4
		},
		businessStateBadge: {
			position: 'absolute',
			top: 12,
			left: 12,
			borderRadius: 12,
			paddingHorizontal: 8,
			paddingVertical: 4,
			backgroundColor: themeColors.background50,
			backdropFilter: 'blur(4px)'
		},
		businessStateText: {
			fontSize: 11,
			fontWeight: '600',
			color: themeColors.buttonText
		},
		// Contact Buttons
		contactButtons: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			marginTop: opts.isExtraSmall ? 8 : 12,
			gap: opts.isExtraSmall ? 6 : 8
		},
		contactButton: {
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			paddingVertical: opts.isExtraSmall ? 8 : 10,
			paddingHorizontal: opts.isExtraSmall ? 10 : 12,
			borderRadius: opts.isExtraSmall ? 6 : 8,
			backgroundColor: colors.backgroundSecondary,
			borderWidth: 0.5,
			borderColor: colors.border
		},
		whatsappButton: {
			backgroundColor: themeColors.whatsApp,
			borderColor: themeColors.whatsApp
		},
		viewButton: {
			backgroundColor: colors.primary,
			borderRadius: opts.isExtraSmall ? 6 : 10,
			paddingVertical: opts.isExtraSmall ? 10 : 12,
			paddingHorizontal: opts.isExtraSmall ? 14 : 18,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			marginTop: opts.isExtraSmall ? 8 : 12
		},
		// Address
		addressContainer: {
			flexDirection: 'row',
			alignItems: 'flex-start',
			marginTop: 8,
			marginBottom: 12
		},
		addressText: {
			flex: 1,
			fontSize: opts.smallFontSize,
			color: colors.textSecondary,
			marginLeft: 8,
			lineHeight: opts.smallFontSize * 1.3
		},
		// Empty State
		emptyContainer: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
			padding: opts.isExtraSmall ? 16 : 24
		},
		// Loading State
		loadingContainer: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
			padding: opts.isExtraSmall ? 16 : 24
		}
	})

interface ResponsiveConfig {
	numColumns: number
	cardWidth: number
	imageHeight: number
	gap: number
	padding: number
	fontSize: number
	subtitleFontSize: number
	smallFontSize: number
	isCompact: boolean
	showExtended: boolean
	isExtraSmall: boolean
	isSmallScreen: boolean
	isMediumScreen: boolean
	isLargeScreen: boolean
	isExtraLarge: boolean
}

const getResponsiveConfig = (width: number): ResponsiveConfig => {
	// More granular breakpoints for better responsiveness
	const isExtraSmall = width < 360
	const isSmallScreen = width >= 360 && width < 480
	const isMediumScreen = width >= 480 && width < 768
	const isLargeScreen = width >= 768 && width < 1024
	const isExtraLarge = width >= 1024

	// Dynamic container padding based on screen size
	const containerPadding = isExtraSmall ? 8 : isSmallScreen ? 12 : isMediumScreen ? 16 : 20
	const availableWidth = width - containerPadding * 2

	// Responsive card sizing
	const minCardWidth = isExtraSmall ? 160 : isSmallScreen ? 200 : isMediumScreen ? 240 : 280
	const maxCardWidth = isExtraLarge ? 380 : isLargeScreen ? 340 : isMediumScreen ? 300 : 260

	// Responsive gap between cards
	const gap = isExtraSmall ? 8 : isSmallScreen ? 10 : isMediumScreen ? 12 : isLargeScreen ? 16 : 20

	// Calculate optimal number of columns
	let numColumns = Math.max(1, Math.floor(availableWidth / (minCardWidth + gap)))

	// Limit maximum columns for better UX
	numColumns = Math.min(numColumns, isExtraLarge ? 5 : isLargeScreen ? 4 : isMediumScreen ? 3 : 2)

	// Calculate card width to fill available space
	const totalGapWidth = (numColumns - 1) * gap
	const cardWidth = Math.min(maxCardWidth, (availableWidth - totalGapWidth) / numColumns)

	// Responsive image height (maintain aspect ratio)
	const imageHeight = Math.round(cardWidth * (isExtraSmall ? 0.65 : 0.6))

	// Responsive font sizes
	const fontSize = isExtraSmall ? 12 : isSmallScreen ? 13 : isMediumScreen ? 14 : isLargeScreen ? 15 : 16
	const subtitleFontSize = fontSize - 1
	const smallFontSize = fontSize - 2

	return {
		numColumns,
		cardWidth,
		imageHeight,
		gap,
		padding: containerPadding,
		fontSize,
		subtitleFontSize,
		smallFontSize,
		isCompact: width < 400,
		showExtended: width >= 600,
		isExtraSmall,
		isSmallScreen,
		isMediumScreen,
		isLargeScreen,
		isExtraLarge
	}
}

export default function BusinessesListScreen() {
	const { colors } = useTheme()
	const router = useRouter()
	const { data: response, isInitialLoading, isRefreshing, isOffline, refresh } = useBusinesses()
	const businesses = response?.data?.docs || []
	const { translate, localize } = useUser()
	const { onScroll } = useScrollHandler()

	const { width } = useWindowDimensions()
	const responsiveConfig = getResponsiveConfig(width)
	const {
		numColumns,
		cardWidth,
		imageHeight,
		gap,
		padding,
		fontSize,
		subtitleFontSize,
		smallFontSize,
		isCompact,
		showExtended,
		isExtraSmall,
		isSmallScreen,
		isMediumScreen,
		isLargeScreen,
		isExtraLarge
	} = responsiveConfig

	const styles = createStyles(colors, {
		cardWidth,
		numColumns,
		padding,
		fontSize,
		subtitleFontSize,
		smallFontSize,
		imageHeight,
		isCompact,
		showExtended,
		isExtraSmall,
		isSmallScreen,
		isMediumScreen,
		isLargeScreen,
		isExtraLarge
	})

	const handleRefresh = () => {
		refresh()
	}

	const onRefresh = handleRefresh

	const handleBusinessPress = (slug: string) => {
		router.push(`/businesses/${slug}` as any)
	}

	const renderBusinessCard = useCallback(
		({ item }: { item: Business }) => (
			<View style={{ width: '100%', paddingHorizontal: numColumns > 1 ? gap / 2 : 0, marginBottom: gap }}>
				<BusinessCard
					business={item}
					width={cardWidth}
					imageHeight={imageHeight}
					showExtended={showExtended}
					isExtraSmall={isExtraSmall}
					fontSize={fontSize}
					subtitleFontSize={subtitleFontSize}
					smallFontSize={smallFontSize}
				/>
			</View>
		),
		[numColumns, cardWidth, imageHeight, showExtended, isExtraSmall, fontSize, subtitleFontSize, smallFontSize, gap]
	)

	const renderEmpty = useCallback(() => {
		if (isOffline) {
			return <ErrorState />
		}
		return <EmptyState style={styles.emptyContainer as ViewStyle} />
	}, [isOffline])

	// Handle loading state
	if (isInitialLoading) {
		return <Spinner />
	}

	// Main render
	return (
		<View style={styles.container as ViewStyle}>
			<Stack.Screen
				options={
					{
						title: translate('discover_businesses', 'Discover Businesses'),
						subtitle: `${businesses.length} ${businesses.length === 1 ? translate('business_product', 'business') : translate('business_products_plural', 'businesses')} ${translate('businesses_available', 'available near you')}`,
						headerActions: [
							{
								key: 'refresh',
								onPress: handleRefresh,
								isRefreshing: isRefreshing,
								accessibilityLabel: 'Refresh'
							}
						]
					} as any
				}
			/>
			<SmartHeader.FlashList
				key={`cols-${numColumns}`}
				data={businesses}
				renderItem={renderBusinessCard}
				keyExtractor={(item: Business) => item._id}
				estimatedItemSize={250}
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
