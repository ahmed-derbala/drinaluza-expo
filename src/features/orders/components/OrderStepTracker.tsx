import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { useTheme } from '@/core/theme'

interface OrderStepTrackerProps {
	stepIndex: number
	steps: string[]
}

export const OrderStepTracker = React.memo(function OrderStepTracker({ stepIndex, steps }: OrderStepTrackerProps) {
	const { colors } = useTheme()

	if (stepIndex === -1 || steps.length < 2) return null

	const progress = `${Math.max(0, Math.min(100, (stepIndex / (steps.length - 1)) * 100))}%`

	return (
		<View style={styles.tracker}>
			<View style={[styles.line, { backgroundColor: colors.border + '30' }]} />
			<View style={[styles.lineProgress, { backgroundColor: colors.primary, width: progress as any }]} />
			<View style={styles.row}>
				{steps.map((step, idx) => {
					const active = idx <= stepIndex
					const isCurrent = idx === stepIndex
					return (
						<View key={step} style={styles.item}>
							<View
								style={[
									styles.dotOuter,
									{
										borderColor: isCurrent ? colors.primary : active ? colors.primary + '50' : 'transparent',
										backgroundColor: isCurrent ? colors.primary + '15' : 'transparent'
									}
								]}
							>
								<View
									style={[
										styles.dot,
										{
											backgroundColor: active ? colors.primary : colors.surfaceVariant,
											borderColor: isCurrent ? colors.text : active ? colors.primary : colors.border
										}
									]}
								>
									{active && <Ionicons name="checkmark" size={8} color="#fff" />}
								</View>
							</View>
							<Text style={[styles.label, { color: active ? colors.text : colors.textSecondary, fontWeight: active ? '700' : '500' }]}>{step}</Text>
						</View>
					)
				})}
			</View>
		</View>
	)
})

const styles = StyleSheet.create({
	tracker: {
		marginVertical: 20,
		position: 'relative',
		height: 42,
		justifyContent: 'center'
	},
	line: {
		position: 'absolute',
		top: 11,
		left: 28,
		right: 28,
		height: 3,
		borderRadius: 1.5
	},
	lineProgress: {
		position: 'absolute',
		top: 11,
		left: 28,
		height: 3,
		borderRadius: 1.5
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	item: {
		alignItems: 'center',
		width: 64
	},
	dotOuter: {
		width: 24,
		height: 24,
		borderRadius: 12,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	dot: {
		width: 14,
		height: 14,
		borderRadius: 7,
		borderWidth: 2,
		justifyContent: 'center',
		alignItems: 'center'
	},
	label: {
		fontSize: 9,
		textAlign: 'center',
		marginTop: 8,
		letterSpacing: -0.1
	}
})
