import React from 'react'
import SmartModal from './SmartModal'
import type { SmartModalProps } from './types'

export interface FullscreenModalProps extends Omit<SmartModalProps, 'variant'> {}

/**
 * A fullscreen modal that takes up the entire screen
 * Best for: complex forms, multi-step wizards, image viewers, and immersive content
 */
export default function FullscreenModal({ ...props }: FullscreenModalProps) {
	return <SmartModal {...props} variant="fullscreen" animationType="slide" />
}
