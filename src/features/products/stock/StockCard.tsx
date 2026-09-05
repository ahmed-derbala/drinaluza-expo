/**
 * StockCard — inventory quantity & threshold display and editing.
 *
 * Purpose: single-purpose card based on BaseCard (standard shape and edit
 * chrome); it composes StockForm for the editable fields and owns only stock
 * display logic.
 */
import React from 'react'
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@theme'
import { useUser } from '@contexts/UserContext'
import { BaseCard } from '@cards/BaseCard'
import { SaveButton, CancelButton } from '@buttons'
import { StockForm } from './StockForm'

export interface StockCardProps {
	/** Card variant. 'view' displays values, 'edit'/'create' show the form. */
	variant: 'view' | 'edit' | 'create'
	/** Editable stock quantity value. */
	stockQuantity: string
	/** Updates the stock quantity value. */
	setStockQuantity: (v: string) => void
	/** Editable minimum threshold value. */
	minThreshold: string
	/** Updates the minimum threshold value. */
	setMinThreshold: (v: string) => void
	/** Displayed stock quantity in view mode. */
	stockQuantityVal?: number
	/** Displayed minimum threshold in view mode. */
	minThresholdVal?: number
	/** When true with onEditPress, view mode shows an edit trigger. */
	canEdit?: boolean
	/** Enters edit mode (view mode). */
	onEditPress?: () => void
	/** Saves the form (edit mode). */
	onSavePress?: () => void
	/** Cancels editing (edit mode). */
	onCancelPress?: () => void
	/** Loading state forwarded to BaseCard (spins/disables the save action). */
	loading?: boolean
	/** Optional container style override. */
	style?: StyleProp<ViewStyle>
}

export function StockCard({
	variant,
	stockQuantity,
	setStockQuantity,
	minThreshold,
	setMinThreshold,
	stockQuantityVal = 0,
	minThresholdVal = 10,
	canEdit = false,
	onEditPress,
	onSavePress,
	onCancelPress,
	loading = false,
	style
}: StockCardProps) {
	const { colors } = useTheme()
	const { translate } = useUser()

	if (variant === 'create' || variant === 'edit') {
		const isEditing = variant === 'edit'
		return (
			<BaseCard
				title={translate('inventory', 'Inventory')}
				iconName="cube-outline"
				mode={isEditing ? 'form' : 'view'}
				headerRight={
					isEditing && (onSavePress || onCancelPress) ? (
						<>
							{onCancelPress ? <CancelButton onPress={onCancelPress} /> : null}
							{onSavePress ? <SaveButton onPress={onSavePress} loading={loading} disabled={loading} /> : null}
						</>
					) : null
				}
				style={style}
			>
				<StockForm stockQuantity={stockQuantity} setStockQuantity={setStockQuantity} minThreshold={minThreshold} setMinThreshold={setMinThreshold} />
			</BaseCard>
		)
	}

	return (
		<BaseCard title={translate('inventory', 'Inventory')} iconName="cube-outline" mode={canEdit ? 'edit' : 'view'} onEdit={onEditPress} style={style}>
			<View style={styles.row}>
				<Ionicons name="cube-outline" size={18} color={colors.textSecondary} style={styles.icon} />
				<Text style={[styles.label, { color: colors.textSecondary }]}>{translate('stock_quantity', 'Stock Quantity')}</Text>
				<Text style={[styles.value, { color: colors.text }]}>{stockQuantityVal}</Text>
			</View>
		</BaseCard>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12
	},
	icon: {
		marginRight: 8
	},
	label: {
		fontSize: 14,
		fontWeight: '500',
		flex: 1
	},
	value: {
		fontSize: 15,
		fontWeight: '700'
	}
})

export default StockCard
