import BaseModal from './BaseModal'
import type { BaseModalProps } from './types'

export interface FullscreenModalProps extends Omit<BaseModalProps, 'variant'> {}

export default function FullscreenModal(props: FullscreenModalProps) {
	return <BaseModal {...props} variant="fullscreen" />
}
