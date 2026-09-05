import React from 'react'
import { IconBaseButton } from '@buttons/IconBaseButton'

export interface AddToCartButtonProps {
	disabled?: boolean
	onPress: (event?: any) => void
	size?: number
	style?: any
	accessibilityLabel?: string
}

export function AddToCartButton({ disabled = false, onPress, size = 36, style, accessibilityLabel = 'Add to cart' }: AddToCartButtonProps) {
	return <IconBaseButton icon="add-shopping-cart" iconType="material" label={accessibilityLabel} onPress={onPress} disabled={disabled} variant="primary" size={size} style={style} />
}

export default AddToCartButton
