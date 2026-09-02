import React, { useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme, themeColors } from '@/core/theme'
import { CARD } from '@/core/theme/constants'
import { useUser } from '@/core/contexts/UserContext'
import { SmartMediaView } from '@/core/smart-media'
import { DeleteButton } from '@/features/common/buttons/DeleteButton'
import { QuantityStepper } from '@/features/common/QuantityStepper'
import { Price } from '@/features/common/Price'

// ─── Types ──────────────────────────────────────────────────────────────────
export interface OrderProduct {
	product: {
		_id: string
		slug?: string
		name: any
		media?: { thumbnail?: { url: string }; gallery?: any[] }
		defaultProduct?: { media?: { thumbnail?: { url: string } } }
		unit?: { measure?: string; min?: number; max?: number; step?: number }
		price?: { total: { tnd?: number; eur?: number; usd?: number } }
	}
	quantity: number
	_id?: string
	lineTotal?: { total: { tnd?: number; eur?: number; usd?: number } }
}

export interface OrderProductCardProps {
	item: OrderProduct
	editable?: boolean
	disabled?: boolean
	onIncrement?: () => void
	onDecrement?: () => void
	onRemove?: () => void
	onPress?: () => void
}

// ─── Component ──────────────────────────────────────────────────────────────
export const OrderProductCard = React.memo(function OrderProductCard({ item, editable = false, disabled = false, onIncrement, onDecrement, onRemove, onPress }: OrderProductCardProps) {
	const { colors } = useTheme()
	const { localize, translate } = useUser()

	const product: any = (item as any).product ?? item

	const imageUrl = useMemo(() => {
		return product?.media?.thumbnail?.url || product?.defaultProduct?.media?.thumbnail?.url || (item as any).media?.thumbnail?.url || null
	}, [product?.media?.thumbnail?.url, product?.defaultProduct?.media?.thumbnail?.url, (item as any).media?.thumbnail?.url])

	const min = product?.unit?.min ?? 1
	const max = product?.unit?.max ?? Infinity

	const Wrapper: any = onPress ? TouchableOpacity : View
	const wrapperProps = onPress ? { onPress, activeOpacity: 0.7, disabled } : {}

	return (
		<Wrapper {...wrapperProps} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityRole={onPress ? 'button' : undefined}>
			<SmartMediaView media={imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" isVisible />
			<LinearGradient
				colors={[themeColors.background50, themeColors.background25, themeColors.background75]}
				start={{ x: 0, y: 0 }}
				end={{ x: 0, y: 1 }}
				style={[StyleSheet.absoluteFill, { pointerEvents: 'none' as any }]}
			/>

			<View style={[styles.topRow, { pointerEvents: 'box-none' as any }]}>
				<Text style={[styles.name, { color: themeColors.buttonText }]} numberOfLines={1}>
					{localize(product?.name ?? (item as any).name)}
				</Text>
				{editable && onRemove ? <DeleteButton onPress={onRemove} disabled={disabled} size={32} /> : <View style={styles.topRightPlaceholder} />}
			</View>

			<View style={[styles.bottomRow, { pointerEvents: 'box-none' as any }]}>
				<View style={styles.priceWrap}>
					<Price price={product?.price ?? (item as any).price} unit={product?.unit ?? (item as any).unit} quantity={item.quantity} compact />
				</View>
				{editable ? (
					<QuantityStepper
						value={item.quantity}
						onIncrement={onIncrement as any}
						onDecrement={onDecrement as any}
						decrementDisabled={disabled || item.quantity <= min}
						incrementDisabled={disabled || item.quantity >= max}
						buttonSize={28}
						style={styles.stepper}
					/>
				) : null}
			</View>
		</Wrapper>
	)
})

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	card: {
		width: 280,
		height: 160,
		borderRadius: CARD.borderRadius,
		borderWidth: 1,
		overflow: 'hidden',
		justifyContent: 'space-between'
	},
	topRow: {
		position: 'absolute',
		top: 8,
		left: 8,
		right: 8,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		gap: 8,
		zIndex: 1
	},
	name: {
		flex: 1,
		fontSize: 13,
		fontWeight: '700',
		letterSpacing: -0.2,
		flexShrink: 1,
		textAlign: 'left',
		alignSelf: 'flex-start'
	},
	topRightPlaceholder: {
		width: 32,
		height: 32
	},
	bottomRow: {
		position: 'absolute',
		bottom: 8,
		left: 8,
		right: 8,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-end',
		gap: 8,
		zIndex: 1
	},
	priceWrap: {
		flex: 1,
		minWidth: 0,
		maxWidth: 140
	},
	stepper: {
		flexShrink: 0
	}
})
