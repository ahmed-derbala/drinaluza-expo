import React from 'react'
import { StyleProp, ViewStyle } from 'react-native'

export interface SmartScreenHeaderProps {
	/**
	 * Main title of the header. Can be overridden by custom components in children.
	 */
	title?: string
	/**
	 * Secondary subtitle text shown below the main title.
	 */
	subtitle?: string
	/**
	 * Whether to show the default back button. Defaults to false.
	 */
	showBackButton?: boolean
	/**
	 * Callback when the back button is pressed. Defaults to expo-router back navigation.
	 */
	onBackPress?: () => void
	/**
	 * Custom React node to render on the left side of the header.
	 */
	headerLeft?: React.ReactNode
	/**
	 * Custom React node to render on the right side of the header.
	 */
	headerRight?: React.ReactNode
	/**
	 * Whether the header is in a loading state. Shows a spinner in place of/next to title.
	 */
	loading?: boolean
	/**
	 * Whether to automatically add safe area top padding (status bar spacing). Defaults to true.
	 */
	safeArea?: boolean
	/**
	 * Whether to draw a border at the bottom of the header. Defaults to true.
	 */
	borderBottom?: boolean
	/**
	 * Custom background color for the header. Defaults to theme's background/card color.
	 */
	backgroundColor?: string
	/**
	 * Custom style overrides for the header outer container.
	 */
	style?: StyleProp<ViewStyle>
	/**
	 * Fully custom layout composition. If provided, overrides default title/left/right layout
	 * but keeps the premium container wrapper (safe area, background, borders).
	 */
	children?: React.ReactNode
}

export interface SmartScreenHeaderBackButtonProps {
	/**
	 * Callback triggered when back button is pressed. Defaults to router.back().
	 */
	onPress?: () => void
	/**
	 * Custom color for the back icon. Defaults to theme's text color.
	 */
	color?: string
	/**
	 * Size of the back icon. Defaults to 26.
	 */
	size?: number
	/**
	 * Accessibility string describing the action. Defaults to 'Go back'.
	 */
	accessibilityLabel?: string
}

export interface SmartScreenHeaderActionButtonProps {
	/**
	 * Name of the icon to render (must match the chosen icon family).
	 */
	iconName: any
	/**
	 * Icon collection family. Defaults to 'ionicons'.
	 */
	iconType?: 'ionicons' | 'material'
	/**
	 * Callback function triggered when action is pressed.
	 */
	onPress: () => void
	/**
	 * Optional badge count to display as a red dot/bubble.
	 */
	badgeCount?: number
	/**
	 * Custom background color. Defaults to transparent or light overlay.
	 */
	backgroundColor?: string
	/**
	 * Custom color for the icon. Defaults to theme's primary color.
	 */
	iconColor?: string
	/**
	 * Text description for accessibility screen readers (Mandatory).
	 */
	accessibilityLabel: string
	/**
	 * Touch/hit area and button bounding size. Defaults to 38.
	 */
	size?: number
	/**
	 * Whether the button is disabled. Disables press handlers and lowers opacity.
	 */
	disabled?: boolean
}

export interface SmartScreenHeaderTitleProps {
	/**
	 * Title string to display.
	 */
	title?: string
	/**
	 * Optional subtitle to show below title.
	 */
	subtitle?: string
	/**
	 * Shows loading spinner. If true, wraps the title in a loading layout.
	 */
	loading?: boolean
	/**
	 * Custom text color for the title. Defaults to theme text.
	 */
	color?: string
	/**
	 * Custom text color for the subtitle. Defaults to theme textSecondary.
	 */
	subtitleColor?: string
}
