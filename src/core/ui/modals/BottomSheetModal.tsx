import BaseModal from './BaseModal'
import type { BaseModalProps } from './types'

export interface BottomSheetModalProps extends Omit<BaseModalProps, 'variant'> {
	maxHeight?: number
}

export default function BottomSheetModal({ maxHeight, ...props }: BottomSheetModalProps) {
	const modalStyle = maxHeight ? { ...props.modalStyle, maxHeight } : props.modalStyle
	return <BaseModal {...props} variant="bottomSheet" modalStyle={modalStyle} />
}
