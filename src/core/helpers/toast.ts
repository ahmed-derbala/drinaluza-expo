/**
 * Unified Toast Message Function Helper
 * Allows showing toasts from anywhere in the app, even outside React components.
 */

import { ToastType, ToastAction } from '@/components/common/Toast'

type ShowToastFn = (options: { message: string; type?: ToastType; duration?: number; actions?: ToastAction[] }) => void

let showToastRef: ShowToastFn | null = null

/**
 * Internal function to register the toast show function from the Provider
 */
export const registerToast = (fn: ShowToastFn) => {
	showToastRef = fn
}

export const toast = {
	show: (options: { message: string; type?: ToastType; duration?: number; actions?: ToastAction[] }) => {
		if (showToastRef) {
			showToastRef(options)
		} else {
			console.warn('Toast helper called before Provider was registered')
		}
	},
	success: (message: string, duration?: number) => toast.show({ message, type: 'success', duration }),
	error: (message: string, duration?: number) => toast.show({ message, type: 'error', duration }),
	warning: (message: string, duration?: number) => toast.show({ message, type: 'warning', duration }),
	info: (message: string, duration?: number) => toast.show({ message, type: 'info', duration })
}
