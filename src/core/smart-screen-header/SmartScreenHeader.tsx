import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Platform, Animated, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/core/theme'
import { BackButton } from './BackButton'
import HeaderAction from './HeaderAction'

export interface SmartScreenHeaderProps {
	/**
	 * Main title text.
	 */
	title?: string
	/**
	 * Secondary subtitle text.
	 */
	subtitle?: string
	/**
	 * Optional left side component slot. Overrides showBackButton.
	 */
	headerLeft?: React.ReactNode
	/**
	 * Optional right side component slot.
	 */
	headerRight?: React.ReactNode
	/**
	 * Callback when default back button is pressed.
	 */
	onBackPress?: () => void
	/**
	 * Whether to show default BackButton in left slot.
	 */
	showBackButton?: boolean
	/**
	 * Triggers a looping premium linear loading bar along the bottom.
	 */
	loading?: boolean
}

// Consistent header height (excluding status bar safe area)
const HEADER_HEIGHT = Platform.select({
	ios: 44,
	android: 56,
	default: 56
})

export const SmartScreenHeader: React.FC<SmartScreenHeaderProps> & {
	BackButton: typeof BackButton
	Action: typeof HeaderAction
} = ({ title, subtitle, headerLeft, headerRight, onBackPress, showBackButton = false, loading = false }) => {
	const { colors } = useTheme()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()

	const loadingAnim = useRef(new Animated.Value(-100)).current

	useEffect(() => {
		if (loading) {
			Animated.loop(
				Animated.timing(loadingAnim, {
					toValue: 100,
					duration: 1500,
					useNativeDriver: true
				})
			).start()
		} else {
			loadingAnim.setValue(-100)
			loadingAnim.stopAnimation()
		}
	}, [loading])

	// Calculate top padding (Safe Area)
	const calculatedPaddingTop = insets.top

	// Loading animation progress bar interpolation
	const barWidth = width * 0.4
	const translateX = loadingAnim.interpolate({
		inputRange: [-100, 100],
		outputRange: [-barWidth, width + barWidth]
	})

	const leftSection = headerLeft ? headerLeft : showBackButton ? <BackButton onPress={onBackPress} /> : null

	return (
		<View
			style={[
				styles.headerContainer,
				{
					backgroundColor: '#000000', // strictly dark theme default background
					borderBottomColor: colors.border || '#3A506B',
					borderBottomWidth: StyleSheet.hairlineWidth,
					paddingTop: calculatedPaddingTop,
					height: HEADER_HEIGHT + calculatedPaddingTop
				}
			]}
		>
			{/* Core row structure */}
			<View style={styles.headerRow} pointerEvents="box-none">
				{/* Left Section */}
				<View style={styles.sideContainer} pointerEvents="box-none">
					{leftSection}
				</View>

				{/* Mathematically Centered Title Container (uses marginHorizontal to avoid button overlaps) */}
				<View style={styles.centerContainer} pointerEvents="box-none">
					{title ? (
						<Text style={[styles.title, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
							{title}
						</Text>
					) : null}
					{subtitle ? (
						<Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
							{subtitle}
						</Text>
					) : null}
				</View>

				{/* Right Section */}
				<View style={[styles.sideContainer, styles.rightContainer]} pointerEvents="box-none">
					{headerRight}
				</View>
			</View>

			{/* Sleek, premium looping loading bar at bottom boundary */}
			{loading && (
				<View style={[styles.loadingTrack, { backgroundColor: colors.borderLight || '#1E293B' }]}>
					<Animated.View
						style={[
							styles.loadingIndicator,
							{
								width: barWidth,
								backgroundColor: colors.primary,
								transform: [{ translateX }]
							}
						]}
					/>
				</View>
			)}
		</View>
	)
}

// Attach sub-components for Composition usage
SmartScreenHeader.BackButton = BackButton
SmartScreenHeader.Action = HeaderAction

const styles = StyleSheet.create({
	headerContainer: {
		width: '100%',
		justifyContent: 'flex-end',
		zIndex: 1000,
		...Platform.select({
			web: {
				boxSizing: 'border-box'
			}
		})
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		height: HEADER_HEIGHT,
		paddingHorizontal: 16,
		position: 'relative',
		width: '100%'
	},
	sideContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-start',
		zIndex: 10,
		minWidth: 44,
		height: '100%'
	},
	rightContainer: {
		justifyContent: 'flex-end',
		gap: 8
	},
	centerContainer: {
		position: 'absolute',
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
		justifyContent: 'center',
		alignItems: Platform.OS === 'ios' ? 'center' : 'flex-start',
		marginHorizontal: 76, // Ensures long titles truncate gracefully before hitting action buttons
		zIndex: 1
	},
	title: {
		fontSize: Platform.OS === 'ios' ? 17 : 20,
		fontWeight: Platform.OS === 'ios' ? '600' : '500',
		textAlign: 'center',
		letterSpacing: -0.3
	},
	subtitle: {
		fontSize: 12,
		marginTop: 1,
		textAlign: 'center',
		opacity: 0.8
	},
	loadingTrack: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		height: 2.5,
		overflow: 'hidden',
		width: '100%'
	},
	loadingIndicator: {
		height: '100%',
		borderRadius: 1
	}
})
