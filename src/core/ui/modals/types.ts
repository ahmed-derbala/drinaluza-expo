import type { ReactNode } from 'react'
import type { AccessibilityRole, TextStyle, ViewStyle } from 'react-native'
import type { Ionicons } from '@expo/vector-icons'

export type IconName = React.ComponentProps<typeof Ionicons>['name']

export type ModalVariant = 'centered' | 'bottomSheet' | 'fullscreen'
export type ModalStatus = 'default' | 'info' | 'success' | 'warning' | 'error'

export type ButtonVariant = 'filled' | 'outlined' | 'ghost'

export interface BaseModalProps {
	visible: boolean
	onClose: () => void
	variant?: ModalVariant
	status?: ModalStatus
	icon?: IconName | ReactNode
	iconColor?: string
	iconBackgroundColor?: string
	title?: string
	subtitle?: string
	message?: string
	children?: ReactNode
	buttons?: ReactNode[]
	headerActions?: ReactNode
	footer?: ReactNode
	closeOnOverlayPress?: boolean
	closeOnBackPress?: boolean
	containerStyle?: ViewStyle
	contentStyle?: ViewStyle
	modalStyle?: ViewStyle
	maxWidth?: number
	scrollable?: boolean
	scrollDirection?: 'vertical' | 'horizontal' | 'both'
	hideDragHandle?: boolean
	accessible?: boolean
	accessibilityLabel?: string
	accessibilityRole?: AccessibilityRole
	testID?: string
}

export interface ModalContextValue {
	visible: boolean
	onClose: () => void
	variant: ModalVariant
}
