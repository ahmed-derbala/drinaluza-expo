import React from 'react'
import SmartModal from './SmartModal'
import type { SmartModalProps } from './types'

export interface BottomSheetModalProps extends Omit<SmartModalProps, 'variant'> {
	/**
	 * Maximum height in pixels or percentage points (default: 88% of screen)
	 */
	maxHeight?: number
}

/**
 * A bottom sheet modal anchored to the bottom of the screen.
 * Best for: pickers, filters, mobile-optimized lists, and contextual actions.
 */
export default function BottomSheetModal({ maxHeight, ...props }: BottomSheetModalProps) {
	const modalStyle = maxHeight ? { ...props.modalStyle, maxHeight } : props.modalStyle
	return <SmartModal {...props} variant="bottomSheet" modalStyle={modalStyle} />
}
