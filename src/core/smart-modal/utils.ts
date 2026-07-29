import type { AppThemeColors } from '@/core/theme'
import type { IconName, ModalStatus } from './types'

export const STATUS_ICONS: Record<ModalStatus, IconName> = {
	default: 'information-circle',
	info: 'information-circle',
	success: 'checkmark-circle',
	warning: 'warning',
	error: 'alert-circle'
}

export function getStatusColor(status: ModalStatus, colors: AppThemeColors): string {
	switch (status) {
		case 'info':
			return colors.info
		case 'success':
			return colors.success
		case 'warning':
			return colors.warning
		case 'error':
			return colors.error
		default:
			return colors.primary
	}
}
