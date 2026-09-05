/**
 * StockForm — editable stock quantity & threshold fields.
 *
 * Purpose: keep StockCard focused on view/edit switching; this form owns the
 * field composition, built on BaseForm primitives (BaseForm, FormRow,
 * FormCol, FormLabel, FormInputWrapper, FormInput).
 */
import React from 'react'
import { useTheme } from '@theme'
import { useUser } from '@contexts/UserContext'
import { BaseForm, FormRow, FormCol, FormLabel, FormInputWrapper, FormInput } from '@forms'

export interface StockFormProps {
	/** Current stock quantity value. */
	stockQuantity: string
	/** Updates the stock quantity value. */
	setStockQuantity: (v: string) => void
	/** Current minimum threshold value. */
	minThreshold: string
	/** Updates the minimum threshold value. */
	setMinThreshold: (v: string) => void
}

export function StockForm({ stockQuantity, setStockQuantity, minThreshold, setMinThreshold }: StockFormProps) {
	const { colors } = useTheme()
	const { translate } = useUser()

	return (
		<BaseForm>
			<FormRow>
				<FormCol>
					<FormLabel>{translate('stock_quantity', 'Stock Quantity')}</FormLabel>
					<FormInputWrapper style={{ borderColor: colors.primary, backgroundColor: colors.surfaceVariant }}>
						<FormInput value={stockQuantity} onChangeText={setStockQuantity} placeholder="0" keyboardType="numeric" />
					</FormInputWrapper>
				</FormCol>
				<FormCol>
					<FormLabel>{translate('min_threshold', 'Min Threshold')}</FormLabel>
					<FormInputWrapper style={{ borderColor: colors.primary, backgroundColor: colors.surfaceVariant }}>
						<FormInput value={minThreshold} onChangeText={setMinThreshold} placeholder="10" keyboardType="numeric" />
					</FormInputWrapper>
				</FormCol>
			</FormRow>
		</BaseForm>
	)
}

export default StockForm
