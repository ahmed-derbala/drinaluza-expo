import type { ReactNode } from 'react'
import type { AccessibilityRole, TextStyle, ViewStyle } from 'react-native'
import type { Ionicons } from '@expo/vector-icons'

export type IconName = React.ComponentProps<typeof Ionicons>['name']

export type ModalVariant = 'centered' | 'bottomSheet' | 'fullscreen'
export type ModalStatus = 'default' | 'info' | 'success' | 'warning' | 'error'

export type ButtonVariant = 'filled' | 'outlined' | 'ghost'

export interface SmartModalButton {
	/**
	 * Button label text. Omit to render an icon-only button.
	 */
	text?: string
	/**
	 * Press callback. Can be async for actions that update state.
	 */
	onPress: () => void | Promise<void>
	/**
	 * Visual style of the button
	 */
	variant?: ButtonVariant
	/**
	 * Override button color. Defaults to the modal status color or theme primary.
	 */
	color?: string
	/**
	 * Ionicons icon name rendered next to the label
	 */
	icon?: IconName
	/**
	 * Position of the icon relative to the label
	 */
	iconPosition?: 'left' | 'right'
	/**
	 * Disable the button
	 */
	disabled?: boolean
	/**
	 * Show a loading spinner
	 */
	loading?: boolean
	/**
	 * Additional button container style
	 */
	style?: ViewStyle
	/**
	 * Additional button text style
	 */
	textStyle?: TextStyle
	/**
	 * Accessibility label for the button
	 */
	accessibilityLabel?: string
	/**
	 * Test ID for testing
	 */
	testID?: string
}

export interface SmartModalProps {
	/**
	 * Controls modal visibility
	 */
	visible: boolean
	/**
	 * Callback when modal is closed
	 */
	onClose: () => void
	/**
	 * Modal variant/layout style
	 */
	variant?: ModalVariant
	/**
	 * Semantic status that drives icon and accent color
	 */
	status?: ModalStatus
	/**
	 * Header icon. Pass an Ionicons name string or a custom React element.
	 * When omitted, a status icon is shown if `status` is set.
	 */
	icon?: IconName | ReactNode
	/**
	 * Override the icon color
	 */
	iconColor?: string
	/**
	 * Override the icon background color
	 */
	iconBackgroundColor?: string
	/**
	 * Modal title
	 */
	title?: string
	/**
	 * Optional subtitle shown under the title
	 */
	subtitle?: string
	/**
	 * A simple message rendered in the modal body. Use `children` for custom content.
	 */
	message?: string
	/**
	 * Modal content
	 */
	children?: ReactNode
	/**
	 * Optional action buttons rendered in the footer
	 */
	buttons?: SmartModalButton[]
	/**
	 * Optional header actions (right side)
	 */
	headerActions?: ReactNode
	/**
	 * Optional custom footer. When provided, `buttons` is ignored.
	 */
	footer?: ReactNode
	/**
	 * Whether to show close button in header
	 */
	showCloseButton?: boolean
	/**
	 * Whether clicking overlay closes modal
	 */
	closeOnOverlayPress?: boolean
	/**
	 * Whether pressing back closes modal (Android)
	 */
	closeOnBackPress?: boolean
	/**
	 * Custom overlay/container style
	 */
	containerStyle?: ViewStyle
	/**
	 * Custom content style
	 */
	contentStyle?: ViewStyle
	/**
	 * Custom modal card style
	 */
	modalStyle?: ViewStyle
	/**
	 * Maximum width for centered modals
	 */
	maxWidth?: number
	/**
	 * Whether the modal body content should scroll when it overflows
	 */
	scrollable?: boolean
	/**
	 * Scroll direction for scrollable content (default: 'vertical')
	 */
	scrollDirection?: 'vertical' | 'horizontal' | 'both'
	/**
	 * Hide the drag handle on bottom-sheet modals
	 */
	hideDragHandle?: boolean
	/**
	 * Whether the modal card is an accessibility element
	 */
	accessible?: boolean
	/**
	 * Accessibility label for the modal
	 */
	accessibilityLabel?: string
	/**
	 * Accessibility role for the modal
	 */
	accessibilityRole?: AccessibilityRole
	/**
	 * Test ID for testing
	 */
	testID?: string
}

export interface ModalContextValue {
	visible: boolean
	onClose: () => void
	variant: ModalVariant
}
