import React, { forwardRef, useRef, useState, useEffect, useCallback } from 'react'
import { ScrollView, Platform, ScrollViewProps, StyleSheet, KeyboardAvoidingView, Pressable, Keyboard, TextInput, LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export interface SmartKeyboardSafeViewProps extends ScrollViewProps {
	/**
	 * Additional bottom offset (in pixels) above the keyboard for the focused input.
	 * @default 60
	 */
	extraScrollHeight?: number

	/**
	 * Dismiss keyboard when tapping empty space outside inputs.
	 * @default true
	 */
	dismissKeyboardOnTap?: boolean

	/**
	 * Offset distance between the top of the screen and the KeyboardAvoidingView.
	 * @default 0
	 */
	keyboardVerticalOffset?: number

	children?: React.ReactNode
	style?: StyleProp<ViewStyle>
	contentContainerStyle?: StyleProp<ViewStyle>
}

/**
 * Reusable, high-fidelity keyboard-avoiding wrapper component.
 * Fully compatible with React Native's New Architecture (Fabric).
 */
export const SmartKeyboardSafeView = forwardRef<ScrollView, SmartKeyboardSafeViewProps>(
	({ children, style, contentContainerStyle, extraScrollHeight = 60, dismissKeyboardOnTap = true, keyboardVerticalOffset = 0, onScroll, onLayout, onFocus, ...props }, ref) => {
		const insets = useSafeAreaInsets()
		const localScrollViewRef = useRef<ScrollView | null>(null)
		const scrollYRef = useRef(0)
		const [viewportHeight, setViewportHeight] = useState(0)

		// Combine local and forwarded refs
		const setScrollViewRef = useCallback(
			(node: ScrollView | null) => {
				localScrollViewRef.current = node
				if (ref) {
					if (typeof ref === 'function') {
						ref(node)
					} else {
						;(ref as any).current = node
					}
				}
			},
			[ref]
		)

		// Web fallback: optimized standard ScrollView to minimize footprint
		if (Platform.OS === 'web') {
			return (
				<ScrollView ref={ref} style={[styles.container, style]} contentContainerStyle={contentContainerStyle} keyboardShouldPersistTaps="handled" {...props}>
					{children}
				</ScrollView>
			)
		}

		// Modern New-Arch compatible measurement and scroll-to-input implementation
		const scrollToFocusedInput = () => {
			setTimeout(() => {
				if (!localScrollViewRef.current || viewportHeight <= 0) return

				const inputNode = TextInput.State.currentlyFocusedInput()
				if (!inputNode) return

				// measureLayout is Fabric-compatible and does not rely on legacy findNodeHandle / UIManager
				inputNode.measureLayout(
					localScrollViewRef.current as any,
					(left, top, width, height) => {
						const currentScrollY = scrollYRef.current
						const visibleBottom = currentScrollY + viewportHeight
						const inputBottom = top + height

						if (inputBottom + extraScrollHeight > visibleBottom) {
							const targetY = inputBottom + extraScrollHeight - viewportHeight
							localScrollViewRef.current?.scrollTo({
								y: targetY,
								animated: true
							})
						} else if (top - 20 < currentScrollY) {
							const targetY = Math.max(0, top - 20)
							localScrollViewRef.current?.scrollTo({
								y: targetY,
								animated: true
							})
						}
					},
					() => {} // silent layout failure recovery
				)
			}, 100)
		}

		// Trigger scrolling when the virtual keyboard pops up or resizes
		useEffect(() => {
			const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
			const subscription = Keyboard.addListener(showEvent, () => {
				scrollToFocusedInput()
			})
			return () => {
				subscription.remove()
			}
		}, [viewportHeight, extraScrollHeight])

		const handleScroll = (event: any) => {
			scrollYRef.current = event.nativeEvent.contentOffset.y
			if (onScroll) {
				onScroll(event)
			}
		}

		const handleLayout = (event: LayoutChangeEvent) => {
			const { height } = event.nativeEvent.layout
			setViewportHeight(height)
			if (onLayout) {
				onLayout(event)
			}
			scrollToFocusedInput()
		}

		const handleFocus = (event: any) => {
			scrollToFocusedInput()
			if (onFocus) {
				onFocus(event)
			}
		}

		return (
			<KeyboardAvoidingView style={[styles.container, style]} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={keyboardVerticalOffset} onFocus={handleFocus}>
				<ScrollView
					ref={setScrollViewRef}
					style={styles.container}
					contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }, contentContainerStyle]}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
					onScroll={handleScroll}
					scrollEventThrottle={16}
					onLayout={handleLayout}
					{...props}
				>
					{dismissKeyboardOnTap ? (
						<Pressable onPress={Keyboard.dismiss} style={styles.pressableContent} accessible={false}>
							{children}
						</Pressable>
					) : (
						children
					)}
				</ScrollView>
			</KeyboardAvoidingView>
		)
	}
)

SmartKeyboardSafeView.displayName = 'SmartKeyboardSafeView'

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	scrollContent: {
		flexGrow: 1
	},
	pressableContent: {
		flexGrow: 1,
		width: '100%'
	}
})
