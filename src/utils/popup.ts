import { Alert, Platform } from 'react-native'
import { translate } from '../constants/translations'

interface PopupAction {
	text: string
	onPress?: () => void
	style?: 'default' | 'cancel' | 'destructive'
}

/**
 * A unified popup function that works on both Web and Native platforms.
 * On Native, it uses Alert.alert.
 * On Web, it uses window.alert or window.confirm.
 */
export const showPopup = (title: string, message: string, actions?: PopupAction[]) => {
	if (Platform.OS === 'web') {
		if (!actions || actions.length === 0) {
			window.alert(`${title}\n\n${message}`)
		} else if (actions.length === 1) {
			window.alert(`${title}\n\n${message}`)
			actions[0].onPress?.()
		} else {
			// Web confirmation - typically yes/no
			// We try to find the 'cancel' action and the primary action
			const cancelAction = actions.find((a) => a.style === 'cancel')
			const primaryAction = actions.find((a) => a.style !== 'cancel') || actions[0]

			const confirmed = window.confirm(`${title}\n\n${message}`)
			if (confirmed) {
				primaryAction.onPress?.()
			} else {
				cancelAction?.onPress?.()
			}
		}
	} else {
		// Native platform: uses standard Alert
		Alert.alert(title, message, actions as any)
	}
}

/**
 * Shorthand for simple success/error notifications
 */
export const showAlert = (title: string, message: string, onOk?: () => void) => {
	showPopup(title, message, [{ text: translate('ok', 'OK'), onPress: onOk }])
}

/**
 * Shorthand for confirmation dialogs
 */
export const showConfirm = (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
	showPopup(title, message, [
		{ text: translate('cancel', 'Cancel'), style: 'cancel', onPress: onCancel },
		{ text: translate('confirm', 'Confirm'), onPress: onConfirm }
	])
}
