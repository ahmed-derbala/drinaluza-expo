import React from 'react'
import SmartModal from './SmartModal'
import type { SmartModalProps } from './types'

export interface CenteredModalProps extends Omit<SmartModalProps, 'variant'> {
	/**
	 * Maximum width of the modal (default: 400)
	 */
	maxWidth?: number
}

/**
 * A centered modal variant that appears in the middle of the screen
 * Best for: alerts, confirmations, forms, and focused interactions
 */
export default function CenteredModal({ maxWidth = 400, ...props }: CenteredModalProps) {
	return <SmartModal {...props} variant="centered" maxWidth={maxWidth} />
}
