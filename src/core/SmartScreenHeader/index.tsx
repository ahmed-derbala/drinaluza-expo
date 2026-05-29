import React, { memo, useCallback } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform, ViewStyle, TextStyle } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, AppThemeColors } from '@/core/theme'
import { HEADER_HEIGHT, DEFAULT_HIT_SLOP } from './constants'
import { SmartHeaderIconButtonProps, SmartBackButtonProps, SmartScreenHeaderProps } from './types'
import { useAppUpdater } from '@/core/app-updater/AppUpdaterContext'

/**
 * Reusable icon button component built specifically for header action rows.
 * Features Web hover/focus styles, Android ripple feedback, custom badging, and loading state.
 */
export const SmartHeaderIconButton = memo(
	({ icon, accessibilityLabel, badgeCount, onPress, disabled = false, loading = false, size = 40, iconSize = 22, iconColor, style, badgeStyle }: SmartHeaderIconButtonProps) => {
		const { colors } = useTheme() as { colors: AppThemeColors }
		const finalIconColor = iconColor || colors.primary

		const renderIconContent = () => {
			if (loading) {
				return <ActivityIndicator size="small" color={finalIconColor} />
			}

			if (typeof icon === 'function') {
				return icon({ color: finalIconColor, size: iconSize })
			}

			if (React.isValidElement(icon)) {
				// Inject correct theme colors and sizing if it's a standard vector icon component
				const iconElement = icon as React.ReactElement<any>
				return React.cloneElement(iconElement, {
					color: iconElement.props?.color || finalIconColor,
					size: iconElement.props?.size || iconSize
				})
			}

			return icon
		}

		return (
			<View style={styles.buttonWrapper}>
				<Pressable
					onPress={disabled || loading ? undefined : onPress}
					accessibilityLabel={accessibilityLabel}
					accessibilityRole="button"
					accessibilityState={{ disabled }}
					disabled={disabled || loading}
					hitSlop={DEFAULT_HIT_SLOP}
					android_ripple={{
						color: colors.primary + '20',
						borderless: true,
						radius: size / 2
					}}
					style={({ pressed, hovered }) => [
						styles.iconBtn,
						{
							width: size,
							height: size,
							borderRadius: size / 2
						},
						hovered && Platform.OS === 'web' && { backgroundColor: colors.surfaceVariant },
						pressed && { opacity: 0.7 },
						disabled && { opacity: 0.4 },
						style
					]}
					// Web-specific keyboard accessibility support
					// @ts-ignore
					dataSet={Platform.select({
						web: { 'data-testid': 'smart-header-icon-btn' },
						default: undefined
					})}
				>
					{renderIconContent()}
				</Pressable>

				{/* Badge Display */}
				{!loading && badgeCount !== undefined && badgeCount > 0 && (
					<View style={[styles.badgeContainer, { backgroundColor: colors.notification }, badgeStyle]} pointerEvents="none">
						<Text style={styles.badgeText} numberOfLines={1}>
							{badgeCount > 99 ? '99+' : badgeCount}
						</Text>
					</View>
				)}
			</View>
		)
	}
)

SmartHeaderIconButton.displayName = 'SmartHeaderIconButton'

/**
 * Reusable screen back navigation button matching iOS/Android standard design systems.
 */
export const SmartBackButton = memo(({ onPress, color, accessibilityLabel, showText = false, style }: SmartBackButtonProps) => {
	const { colors } = useTheme() as { colors: AppThemeColors }
	const router = useRouter()

	const finalColor = color || colors.text
	const finalLabel = accessibilityLabel || 'Go back'

	const handlePress = useCallback(() => {
		if (onPress) {
			onPress()
		} else if (router.canGoBack()) {
			router.back()
		}
	}, [onPress, router])

	const iconName = Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'
	const shouldShowText = showText && (Platform.OS === 'ios' || Platform.OS === 'web')

	return (
		<Pressable
			onPress={handlePress}
			accessibilityLabel={finalLabel}
			accessibilityRole="button"
			hitSlop={DEFAULT_HIT_SLOP}
			android_ripple={{
				color: colors.primary + '15',
				borderless: true,
				radius: 20
			}}
			style={({ pressed, hovered }) => [styles.backBtn, hovered && Platform.OS === 'web' && { backgroundColor: colors.surfaceVariant }, pressed && { opacity: 0.7 }, style]}
		>
			<Ionicons name={iconName} size={24} color={finalColor} />
			{shouldShowText && <Text style={[styles.backText, { color: finalColor }]}>Back</Text>}
		</Pressable>
	)
})

SmartBackButton.displayName = 'SmartBackButton'

/**
 * Highly performant, composable header component supporting both Web and Native viewports.
 * Uses layout absolute mathematical centering to avoid shift and supports flexible состава.
 */
export const SmartScreenHeader = memo(
	({ title, subtitle, leftContent, rightContent, onBackPress, showBackButton, loading = false, transparent = false, sticky = false, className, style }: SmartScreenHeaderProps) => {
		const { colors } = useTheme() as { colors: AppThemeColors }
		const insets = useSafeAreaInsets()
		const router = useRouter()
		const { isDownloading, downloadProgress, startupState } = useAppUpdater()
		const isOptionalDownloading = isDownloading && startupState === 'updateAvailable'

		const finalShowBackButton = showBackButton !== undefined ? showBackButton : router.canGoBack()

		// Safe height containing Safe Area offsets on mobile viewports
		const calculatedHeight = HEADER_HEIGHT + insets.top

		return (
			<View
				accessibilityRole="header"
				// Web-specific classname pass-through
				// @ts-ignore
				className={className}
				style={[
					styles.headerWrapper,
					{
						height: calculatedHeight,
						paddingTop: insets.top,
						backgroundColor: transparent ? 'transparent' : colors.card,
						borderBottomColor: transparent ? 'transparent' : colors.border,
						borderBottomWidth: transparent ? 0 : 1
					},
					sticky && styles.stickyHeader,
					style
				]}
			>
				<View style={[styles.headerContent, { height: HEADER_HEIGHT }]}>
					{/* 1. Left Content Area */}
					<View style={styles.leftContainer}>{leftContent ? leftContent : finalShowBackButton ? <SmartBackButton onPress={onBackPress} color={colors.text} /> : null}</View>

					{/* 2. Absolute Centered Title & Subtitle (Prevents layout shift completely) */}
					<View style={styles.centerContainer} pointerEvents="none">
						{loading ? (
							<ActivityIndicator size="small" color={colors.primary} />
						) : (
							<>
								{typeof title === 'string' ? (
									<Text style={[styles.titleText, { color: colors.text }]} numberOfLines={1}>
										{title}
									</Text>
								) : (
									title
								)}
								{subtitle &&
									(typeof subtitle === 'string' ? (
										<Text style={[styles.subtitleText, { color: colors.textSecondary }]} numberOfLines={1}>
											{subtitle}
										</Text>
									) : (
										subtitle
									))}
							</>
						)}
					</View>

					{/* 3. Right Content Area */}
					<View style={styles.rightContainer}>
						{isOptionalDownloading && (
							<View style={styles.downloadProgressContainer}>
								<ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 4 }} />
								<Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{Math.round(downloadProgress * 100)}%</Text>
							</View>
						)}
						{rightContent}
					</View>
				</View>
			</View>
		)
	}
)

SmartScreenHeader.displayName = 'SmartScreenHeader'

const styles = StyleSheet.create({
	headerWrapper: {
		width: '100%',
		zIndex: 100,
		justifyContent: 'flex-end'
	},
	stickyHeader: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0
	},
	headerContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		position: 'relative'
	},
	leftContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-start',
		zIndex: 10,
		minHeight: 40,
		minWidth: 40
	},
	rightContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-end',
		zIndex: 10,
		minHeight: 40,
		gap: 6
	},
	centerContainer: {
		position: 'absolute',
		left: 72,
		right: 72,
		top: 0,
		bottom: 0,
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 1
	},
	titleText: {
		fontSize: 17,
		fontWeight: '700',
		textAlign: 'center',
		letterSpacing: -0.3
	},
	subtitleText: {
		fontSize: 11,
		fontWeight: '500',
		textAlign: 'center',
		marginTop: 2
	},
	buttonWrapper: {
		position: 'relative',
		justifyContent: 'center',
		alignItems: 'center'
	},
	iconBtn: {
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({
			web: {
				cursor: 'pointer',
				outlineStyle: 'none'
			} as any
		})
	},
	badgeContainer: {
		position: 'absolute',
		top: -2,
		right: -2,
		minWidth: 16,
		height: 16,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 3,
		borderWidth: 1.5,
		borderColor: '#FFFFFF',
		zIndex: 20
	},
	badgeText: {
		color: '#FFFFFF',
		fontSize: 8,
		fontWeight: '800',
		textAlign: 'center'
	},
	backBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 6,
		paddingHorizontal: 8,
		borderRadius: 12,
		gap: 2,
		...Platform.select({
			web: {
				cursor: 'pointer',
				outlineStyle: 'none'
			} as any
		})
	},
	backText: {
		fontSize: 16,
		fontWeight: '500'
	},
	downloadProgressContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Platform.select({
			web: 'rgba(59, 130, 246, 0.1)',
			default: '#3B82F615'
		}),
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		marginRight: 4
	}
})
