/**
 * CheckoutCard — checkout row: total price + quantity stepper + add-to-cart.
 *
 * Purpose: keep the product screen focused on product logic; this card owns
 * the checkout row composition (TotalPriceBlock, QuantityStepperBlock,
 * AddToCartButton) and its layout.
 */
import React from 'react'
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { BaseCard } from '@cards/BaseCard'
import { TotalPriceBlock, QuantityStepperBlock } from '@products/blocks'
import { AddToCartButton } from '@buttons'

export interface CheckoutCardProps {
	/** Price of a single unit in the active currency fallback chain. */
	unitPrice: number
	/** Current quantity. */
	quantity: number
	/** Unit measure shown next to the total (e.g. "kg"). When omitted, no unit is shown. */
	unitMeasure?: string
	/** Callback when quantity increases. */
	onIncrement: (e: any) => void
	/** Callback when quantity decreases. */
	onDecrement: (e: any) => void
	/** Callback when add-to-cart is pressed. */
	onAddToCart: (event?: any) => void
	/** Optional disabled state for decrement button. */
	decrementDisabled?: boolean
	/** Optional disabled state for increment button. */
	incrementDisabled?: boolean
	/** Optional container style override. */
	style?: StyleProp<ViewStyle>
}

export const CheckoutCard = React.memo(function CheckoutCard({
	unitPrice,
	quantity,
	unitMeasure,
	onIncrement,
	onDecrement,
	onAddToCart,
	decrementDisabled = false,
	incrementDisabled = false,
	style
}: CheckoutCardProps) {
	return (
		<BaseCard style={style}>
			<View style={styles.row}>
				<TotalPriceBlock unitPrice={unitPrice} quantity={quantity} unitMeasure={unitMeasure} showLabel={false} />
				<View style={styles.actions}>
					<QuantityStepperBlock value={quantity} onIncrement={onIncrement} onDecrement={onDecrement} decrementDisabled={decrementDisabled} incrementDisabled={incrementDisabled} />
					<AddToCartButton onPress={onAddToCart} />
				</View>
			</View>
		</BaseCard>
	)
})

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	actions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12
	}
})

export default CheckoutCard
