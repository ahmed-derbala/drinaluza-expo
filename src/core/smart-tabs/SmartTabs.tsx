import React, { useEffect, useMemo, useRef, useState } from 'react'
import { LayoutRectangle, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Spinner from '@ui/spinner/Spinner'
import { useTheme } from '@theme'

export interface SmartTabOption {
	value: string
	label: string
	iconName?: string
}

interface SmartTabsProps {
	value: string
	options: SmartTabOption[]
	onChange: (value: string) => void
	counts?: Record<string, number>
	activeCount?: number
	resetKey?: string
	loading?: boolean
	testID?: string
}

export const SmartTabs = React.memo(function SmartTabs({ value, options, onChange, counts, activeCount, resetKey, loading, testID }: SmartTabsProps) {
	const { colors } = useTheme()
	const scrollViewRef = useRef<ScrollView>(null)
	const [containerWidth, setContainerWidth] = useState(0)
	const layoutsRef = useRef<Map<string, LayoutRectangle>>(new Map())
	const loadedCountsRef = useRef<Record<string, number>>({})
	const prevResetKeyRef = useRef(resetKey)

	if (resetKey !== prevResetKeyRef.current) {
		loadedCountsRef.current = {}
		prevResetKeyRef.current = resetKey
	}

	const pressHandlers = useMemo(() => {
		const handlers: Record<string, () => void> = {}
		options.forEach((option) => {
			handlers[option.value] = () => onChange(option.value)
		})
		return handlers
	}, [options, onChange])

	useEffect(() => {
		if (!scrollViewRef.current || containerWidth === 0) return
		const layout = layoutsRef.current.get(value)
		if (!layout) return
		const targetX = Math.max(0, layout.x + layout.width / 2 - containerWidth / 2)
		scrollViewRef.current.scrollTo({ x: targetX, animated: true })
	}, [value, containerWidth])

	return (
		<View style={[styles.container, { borderBottomColor: colors.border }]} testID={testID}>
			<ScrollView
				ref={scrollViewRef}
				horizontal
				showsHorizontalScrollIndicator={Platform.OS === 'web'}
				keyboardShouldPersistTaps="handled"
				scrollEventThrottle={16}
				accessibilityRole="tablist"
				onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
				contentContainerStyle={styles.content}
			>
				{options.map((option) => {
					const selected = value === option.value
					const current = selected ? (activeCount ?? counts?.[option.value]) : counts?.[option.value]

					if (typeof current === 'number') {
						loadedCountsRef.current[option.value] = current
					}

					const count = typeof current === 'number' ? current : loadedCountsRef.current[option.value]
					const showCount = typeof count === 'number'

					return (
						<Pressable
							key={option.value}
							onPress={pressHandlers[option.value]}
							accessibilityRole="tab"
							accessibilityState={{ selected }}
							accessibilityLabel={`${option.label}${showCount ? `, ${count}` : ''}`}
							style={styles.tabPressable}
							hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
							onLayout={(event) => {
								layoutsRef.current.set(option.value, event.nativeEvent.layout)
							}}
						>
							<View style={[styles.tab, { borderBottomColor: selected ? colors.primary : 'transparent' }]}>
								{selected && loading ? (
									<Spinner size="small" expand={false} style={[styles.icon, { padding: 0 }]} />
								) : option.iconName ? (
									<Ionicons name={option.iconName as any} size={16} color={selected ? colors.primary : colors.textSecondary} style={styles.icon} />
								) : null}
								<Text style={[styles.label, { color: selected ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
									{option.label}
								</Text>
								{showCount && (
									<View style={[styles.badge, { backgroundColor: selected ? colors.primary : colors.surfaceVariant || colors.border }]}>
										<Text style={[styles.badgeText, { color: selected ? colors.buttonText : colors.textSecondary }]} numberOfLines={1}>
											{count}
										</Text>
									</View>
								)}
							</View>
						</Pressable>
					)
				})}
			</ScrollView>
		</View>
	)
})

const styles = StyleSheet.create({
	container: {
		width: '100%',
		borderBottomWidth: StyleSheet.hairlineWidth
	},
	content: {
		paddingHorizontal: 8,
		alignItems: 'center'
	},
	tabPressable: {
		paddingHorizontal: 8
	},
	tab: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 2,
		minHeight: 48
	},
	icon: {
		marginRight: 6
	},
	label: {
		fontSize: 14,
		fontWeight: '600'
	},
	badge: {
		paddingHorizontal: 6,
		paddingVertical: 1,
		borderRadius: 10,
		minWidth: 18,
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: 6
	},
	badgeText: {
		fontSize: 11,
		fontWeight: '700',
		lineHeight: 14
	}
})
