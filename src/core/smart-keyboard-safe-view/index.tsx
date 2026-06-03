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
 *
 * Android strategy: Uses `behavior="height"` so the KAV shrinks the ScrollView
 * container when the keyboard appears (works with adjustResize softInputMode).
 * Dynamic bottom padding is added to scroll content so the focused input can
 * always be scrolled above the keyboard.
 *
 * iOS strategy: Uses `behavior="padding"` which adds bottom padding inside
 * the KAV, pushing the ScrollView content up naturally.
 */
export const SmartKeyboardSafeView = forwardRef<ScrollView, SmartKeyboardSafeViewProps>(
	({ children, style, contentContainerStyle, extraScrollHeight = 60, dismissKeyboardOnTap = true, keyboardVerticalOffset = 0, onScroll, onLayout, onFocus, ...props }, ref) => {
		const insets = useSafeAreaInsets()
		const localScrollViewRef = useRef<ScrollView | null>(null)
		const scrollYRef = useRef(0)
		const viewportHeightRef = useRef(0)
		const [keyboardHeight, setKeyboardHeight] = useState(0)

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
		const scrollToFocusedInput = useCallback(() => {
			const attempt = (retryCount: number) => {
				setTimeout(
					() => {
						const currentViewportHeight = viewportHeightRef.current
						if (!localScrollViewRef.current || currentViewportHeight <= 0) return

						const inputNode = TextInput.State.currentlyFocusedInput()
						if (!inputNode) return

						// measureLayout is Fabric-compatible and does not rely on legacy findNodeHandle / UIManager
						inputNode.measureLayout(
							localScrollViewRef.current as any,
							(left, top, width, height) => {
								const currentScrollY = scrollYRef.current
								const visibleBottom = currentScrollY + currentViewportHeight
								const inputBottom = top + height

								if (inputBottom + extraScrollHeight > visibleBottom) {
									const targetY = inputBottom + extraScrollHeight - currentViewportHeight
									localScrollViewRef.current?.scrollTo({
										y: Math.max(0, targetY),
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
							() => {
								// Retry once on measurement failure (layout may not be settled yet)
								if (retryCount < 1) {
									attempt(retryCount + 1)
								}
							}
						)
					},
					Platform.OS === 'android' ? 250 : 100
				)
			}
			attempt(0)
		}, [extraScrollHeight])

		// Track keyboard show/hide to add dynamic bottom padding on Android
		useEffect(() => {
			const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
			const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

			const showSub = Keyboard.addListener(showEvent, (e) => {
				setKeyboardHeight(e.endCoordinates.height)
				scrollToFocusedInput()
			})
			const hideSub = Keyboard.addListener(hideEvent, () => {
				setKeyboardHeight(0)
			})

			return () => {
				showSub.remove()
				hideSub.remove()
			}
		}, [scrollToFocusedInput])

		const handleScroll = useCallback(
			(event: any) => {
				scrollYRef.current = event.nativeEvent.contentOffset.y
				onScroll?.(event)
			},
			[onScroll]
		)

		const handleLayout = useCallback(
			(event: LayoutChangeEvent) => {
				const { height } = event.nativeEvent.layout
				viewportHeightRef.current = height
				onLayout?.(event)
				scrollToFocusedInput()
			},
			[onLayout, scrollToFocusedInput]
		)

		const handleFocus = useCallback(
			(event: any) => {
				scrollToFocusedInput()
				onFocus?.(event)
			},
			[onFocus, scrollToFocusedInput]
		)

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
