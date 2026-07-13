import { ReactNode } from 'react'
import { ViewStyle } from 'react-native'

export type ModalVariant = 'centered' | 'bottomSheet' | 'fullscreen'
export type ModalAnimationType = 'fade' | 'slide' | 'none'

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
	 * Animation type for modal appearance
	 */
	animationType?: ModalAnimationType
	/**
	 * Modal title
	 */
	title?: string
	/**
	 * Optional subtitle
	 */
	subtitle?: string
	/**
	 * Modal content
	 */
	children: ReactNode
	/**
	 * Optional header icon (left side of title)
	 */
	headerIcon?: ReactNode
	/**
	 * Optional header actions (right side)
	 */
	headerActions?: ReactNode
	/**
	 * Optional footer content
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
	 * Custom container style
	 */
	containerStyle?: ViewStyle
	/**
	 * Custom content style
	 */
	contentStyle?: ViewStyle
	/**
	 * Maximum width for centered modals
	 */
	maxWidth?: number
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
