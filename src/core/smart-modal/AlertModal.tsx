import React from 'react'
import CenteredModal from './CenteredModal'
import type { SmartModalButton, SmartModalProps } from './types'

export interface AlertModalProps extends Omit<SmartModalProps, 'variant' | 'buttons' | 'footer'> {
	/**
	 * Label for the single confirm button
	 */
	confirmText?: string
	/**
	 * Callback when the confirm button is pressed.
	 * Defaults to closing the modal.
	 */
	onConfirm?: () => void | Promise<void>
	/**
	 * Full control over the confirm button
	 */
	confirmButton?: Omit<SmartModalButton, 'onPress'>
}

/**
 * A centered alert modal with a single action button.
 * Best for: info messages, success confirmations, warnings, and errors.
 */
export default function AlertModal({ confirmText = 'OK', onConfirm, confirmButton, status = 'info', ...props }: AlertModalProps) {
	const button: SmartModalButton = {
		text: confirmButton?.text ?? confirmText,
		onPress: onConfirm ?? props.onClose,
		variant: confirmButton?.variant ?? 'filled',
		color: confirmButton?.color,
		icon: confirmButton?.icon,
		iconPosition: confirmButton?.iconPosition,
		disabled: confirmButton?.disabled,
		loading: confirmButton?.loading,
		style: confirmButton?.style,
		textStyle: confirmButton?.textStyle,
		accessibilityLabel: confirmButton?.accessibilityLabel,
		testID: confirmButton?.testID
	}

	return <CenteredModal {...props} status={status} buttons={[button]} />
}
