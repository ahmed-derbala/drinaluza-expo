import BaseModal from './BaseModal'
import type { BaseModalProps } from './types'

export interface CenteredModalProps extends Omit<BaseModalProps, 'variant'> {
	maxWidth?: number
}

export default function CenteredModal({ maxWidth = 400, ...props }: CenteredModalProps) {
	return <BaseModal {...props} variant="centered" maxWidth={maxWidth} />
}
