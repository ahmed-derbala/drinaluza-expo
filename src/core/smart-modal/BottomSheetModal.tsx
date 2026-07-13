import React from 'react'
import SmartModal from './SmartModal'
import type { SmartModalProps } from './types'

export interface BottomSheetModalProps extends Omit<SmartModalProps, 'variant'> {
	/**
	 * Maximum height percentage (default: 85%)
	 */
	maxHeight?: string | number
}

/**
 * A bottom sheet modal that slides up from the bottom
 * Best for: pickers, filters, mobile-optimized lists, and contextual actions
 */
export default function BottomSheetModal({ ...props }: BottomSheetModalProps) {
	return <SmartModal {...props} variant="bottomSheet" animationType="slide" />
}
