import CenteredModal from './CenteredModal'
import type { SmartModalProps, SmartModalButton } from './types'

export interface ConfirmModalProps extends Omit<SmartModalProps, 'variant' | 'buttons' | 'footer'> {
	/**
	 * Label for the cancel button
	 */
	cancelText?: string
	/**
	 * Label for the confirm button
	 */
	confirmText?: string
	/**
	 * Callback when the cancel button is pressed. Defaults to closing the modal.
	 */
	onCancel?: () => void | Promise<void>
	/**
	 * Callback when the confirm button is pressed.
	 */
	onConfirm?: () => void | Promise<void>
	/**
	 * Render the confirm button in a danger/error style
	 */
	danger?: boolean
	/**
	 * Full control over the cancel button
	 */
	cancelButton?: Omit<SmartModalButton, 'onPress'>
	/**
	 * Full control over the confirm button
	 */
	confirmButton?: Omit<SmartModalButton, 'onPress'>
}

/**
 * A centered confirmation dialog with cancel and confirm actions.
 * Best for: destructive actions, sign-out confirmations, and decision prompts.
 */
export default function ConfirmModal({ cancelText = 'Cancel', confirmText = 'Confirm', onCancel, onConfirm, danger = false, cancelButton, confirmButton, status, ...props }: ConfirmModalProps) {
	const resolvedStatus = status ?? (danger ? 'error' : 'default')

	const buttons: SmartModalButton[] = [
		{
			text: cancelButton?.text ?? cancelText,
			onPress: onCancel ?? props.onClose,
			variant: cancelButton?.variant ?? 'outlined',
			color: cancelButton?.color,
			icon: cancelButton?.icon ?? 'close-outline',
			iconPosition: cancelButton?.iconPosition,
			disabled: cancelButton?.disabled,
			loading: cancelButton?.loading,
			style: cancelButton?.style,
			textStyle: cancelButton?.textStyle,
			accessibilityLabel: cancelButton?.accessibilityLabel,
			testID: cancelButton?.testID
		},
		{
			text: confirmButton?.text ?? confirmText,
			onPress: onConfirm ?? props.onClose,
			variant: confirmButton?.variant ?? 'filled',
			color: confirmButton?.color,
			icon: confirmButton?.icon ?? 'checkmark',
			iconPosition: confirmButton?.iconPosition,
			disabled: confirmButton?.disabled,
			loading: confirmButton?.loading,
			style: confirmButton?.style,
			textStyle: confirmButton?.textStyle,
			accessibilityLabel: confirmButton?.accessibilityLabel,
			testID: confirmButton?.testID
		}
	]

	return <CenteredModal {...props} status={resolvedStatus} buttons={buttons} />
}
