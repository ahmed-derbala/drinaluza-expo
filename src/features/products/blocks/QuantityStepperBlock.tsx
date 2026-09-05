import { View, Text, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { themeColors } from '@theme'

export interface QuantityStepperBlockProps {
	/** Current quantity value */
	value: number
	/** Callback when quantity increases */
	onIncrement: (e: any) => void
	/** Callback when quantity decreases */
	onDecrement: (e: any) => void
	/** Optional disabled state for decrement button */
	decrementDisabled?: boolean
	/** Optional disabled state for increment button */
	incrementDisabled?: boolean
	/** Optional container style override */
	style?: StyleProp<ViewStyle>
	/** Optional test ID */
	testID?: string
	/** Size variant or button size override (default: 32) */
	buttonSize?: number
}

export function QuantityStepperBlock({
	value,
	onIncrement,
	onDecrement,
	decrementDisabled = false,
	incrementDisabled = false,
	style,
	testID = 'quantity-stepper',
	buttonSize = 32
}: QuantityStepperBlockProps) {
	return (
		<View style={[styles.container, style]} testID={testID}>
			<TouchableOpacity
				onPress={(e: any) => {
					e?.stopPropagation?.()
					e?.preventDefault?.()
					if (!decrementDisabled) onDecrement(e)
				}}
				disabled={decrementDisabled}
				style={[styles.btn, { width: buttonSize, height: buttonSize }, decrementDisabled && styles.btnDisabled]}
				activeOpacity={0.7}
				accessibilityRole="button"
				accessibilityLabel="Decrease quantity"
			>
				<MaterialIcons name="remove" size={16} color={decrementDisabled ? themeColors.buttonText30 : themeColors.buttonText} />
			</TouchableOpacity>
			<Text style={styles.valueText}>{value}</Text>
			<TouchableOpacity
				onPress={(e: any) => {
					e?.stopPropagation?.()
					e?.preventDefault?.()
					if (!incrementDisabled) onIncrement(e)
				}}
				disabled={incrementDisabled}
				style={[styles.btn, { width: buttonSize, height: buttonSize }, incrementDisabled && styles.btnDisabled]}
				activeOpacity={0.7}
				accessibilityRole="button"
				accessibilityLabel="Increase quantity"
			>
				<MaterialIcons name="add" size={16} color={incrementDisabled ? themeColors.buttonText30 : themeColors.buttonText} />
			</TouchableOpacity>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: themeColors.background95,
		borderRadius: 14,
		borderWidth: 1.5,
		borderColor: themeColors.primary,
		padding: 3
	},
	btn: {
		borderRadius: 10,
		backgroundColor: themeColors.buttonText10,
		justifyContent: 'center',
		alignItems: 'center'
	},
	btnDisabled: {
		opacity: 0.5
	},
	valueText: {
		fontSize: 15,
		fontWeight: '800',
		color: themeColors.buttonText,
		minWidth: 32,
		textAlign: 'center',
		marginHorizontal: 4
	}
})

export default QuantityStepperBlock
