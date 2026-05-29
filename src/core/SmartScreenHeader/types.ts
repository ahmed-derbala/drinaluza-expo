import React from 'react'
import { ViewStyle } from 'react-native'

export interface SmartHeaderIconButtonProps {
	/**
	 * Icon rendering function or React node.
	 * Supports vector icons, e.g. (props) => <Ionicons name="cart" {...props} /> or raw <Ionicons name="cart" />.
	 */
	icon: React.ReactNode | ((props: { color: string; size: number }) => React.ReactNode)

	/**
	 * Required accessibility label for screen readers.
	 */
	accessibilityLabel: string

	/**
	 * Optional badge count to display as an overlay count.
	 */
	badgeCount?: number

	/**
	 * Press callback.
	 */
	onPress?: () => void

	/**
	 * Renders button in a disabled state.
	 */
	disabled?: boolean

	/**
	 * Renders an activity loader in place of the icon.
	 */
	loading?: boolean

	/**
	 * Layout size of the button container (minimum interactive area).
	 * @default 40
	 */
	size?: number

	/**
	 * Rendered size of the icon inside the button.
	 * @default 22
	 */
	iconSize?: number

	/**
	 * Custom tint color for the icon.
	 */
	iconColor?: string

	/**
	 * Custom container styles.
	 */
	style?: ViewStyle

	/**
	 * Custom badge overlay styles.
	 */
	badgeStyle?: ViewStyle
}

export interface SmartBackButtonProps {
	/**
	 * Custom callback on back press. If omitted, triggers router.back() via expo-router.
	 */
	onPress?: () => void

	/**
	 * Custom color for the back chevron and optional text.
	 */
	color?: string

	/**
	 * Accessibility label override.
	 * @default "Go back"
	 */
	accessibilityLabel?: string

	/**
	 * Shows "Back" text next to the chevron on iOS and Web viewports.
	 * @default false
	 */
	showText?: boolean

	/**
	 * Custom container styles.
	 */
	style?: ViewStyle
}

export interface SmartScreenHeaderProps {
	/**
	 * Centered main header title string or ReactNode element.
	 */
	title: string | React.ReactNode

	/**
	 * Optional subtitle displayed below the title.
	 */
	subtitle?: string | React.ReactNode

	/**
	 * Optional custom left content. If omitted and showBackButton is true, renders SmartBackButton.
	 */
	leftContent?: React.ReactNode

	/**
	 * Optional right actions content row. Supports composition of multiple icon buttons.
	 */
	rightContent?: React.ReactNode

	/**
	 * Custom back button press callback.
	 */
	onBackPress?: () => void

	/**
	 * Explicitly show or hide the back button.
	 * @default true if router can go back
	 */
	showBackButton?: boolean

	/**
	 * Renders an activity loader in the center header.
	 */
	loading?: boolean

	/**
	 * Transparent background layout which overlays content.
	 * @default false
	 */
	transparent?: boolean

	/**
	 * Fixed absolute top header layout.
	 * @default false
	 */
	sticky?: boolean

	/**
	 * Additional web classname.
	 */
	className?: string

	/**
	 * Custom container styles.
	 */
	style?: ViewStyle
}
