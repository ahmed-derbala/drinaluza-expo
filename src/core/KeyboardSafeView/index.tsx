import React, { forwardRef, useRef, useState, useEffect, useCallback } from 'react'
import {
	ScrollView,
	FlatList,
	Platform,
	ScrollViewProps,
	FlatListProps,
	StyleSheet,
	KeyboardAvoidingView,
	TouchableWithoutFeedback,
	Keyboard,
	TextInput,
	findNodeHandle,
	UIManager,
	LayoutChangeEvent,
	ViewStyle
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export interface KeyboardSafeViewProps extends ScrollViewProps {
	/**
	 * Offset padding (in pixels) added between the focused input field and the virtual keyboard.
	 * Helps ensure helper text, borders, or submit CTA buttons remain visible.
	 * @default 60
	 */
	bottomOffset?: number

	/**
	 * Alias for bottomOffset to maintain full backwards compatibility.
	 */
	extraScrollHeight?: number

	/**
	 * Tapping outside active inputs dismisses the keyboard.
	 * @default true
	 */
	dismissKeyboardOnTap?: boolean

	/**
	 * Alias for dismissKeyboardOnTap.
	 */
	dismissKeyboardOnTapOutside?: boolean

	children?: React.ReactNode
}

/**
 * Reusable layout wrapper component that ensures form inputs and fields are never overlapped
 * by the virtual keyboard on portrait mobile screens, with high-fidelity performance on Web.
 */
export const KeyboardSafeView = forwardRef<ScrollView, KeyboardSafeViewProps>(
	({ children, style, contentContainerStyle, bottomOffset = 60, extraScrollHeight, dismissKeyboardOnTap = true, dismissKeyboardOnTapOutside = true, onScroll, onLayout, onFocus, ...props }, ref) => {
		const insets = useSafeAreaInsets()
		const localScrollViewRef = useRef<ScrollView | null>(null)

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

		const offset = extraScrollHeight !== undefined ? extraScrollHeight : bottomOffset
		const shouldDismissOnTap = dismissKeyboardOnTap && dismissKeyboardOnTapOutside
		const [viewportHeight, setViewportHeight] = useState(0)
		const scrollYRef = useRef(0)

		// Web fallback: optimized standard ScrollView to minimize footprint
		if (Platform.OS === 'web') {
			return (
				<ScrollView ref={ref} style={[styles.container, style]} contentContainerStyle={contentContainerStyle} keyboardShouldPersistTaps="handled" {...props}>
					{children}
				</ScrollView>
			)
		}

		// Dynamic calculation to scroll focused input into comfortable viewport area
		const scrollToFocusedInput = () => {
			setTimeout(() => {
				if (!localScrollViewRef.current || viewportHeight <= 0) return

				const inputNode = TextInput.State.currentlyFocusedInput()
				if (!inputNode) return

				const scrollViewHandle = findNodeHandle(localScrollViewRef.current as any)
				const inputHandle = findNodeHandle(inputNode as any)

				if (scrollViewHandle && inputHandle) {
					UIManager.measureLayout(
						inputHandle,
						scrollViewHandle,
						() => {}, // fallback err callback
						(left, top, width, height) => {
							const currentScrollY = scrollYRef.current
							const visibleBottom = currentScrollY + viewportHeight
							const inputBottom = top + height

							if (inputBottom + offset > visibleBottom) {
								const targetY = inputBottom + offset - viewportHeight
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
						}
					)
				}
			}, 120)
		}

		// Trigger scrolling on keyboard show events
		useEffect(() => {
			const showSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => {
				scrollToFocusedInput()
			})
			return () => {
				showSubscription.remove()
			}
		}, [viewportHeight, offset])

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

		const content = (
			<ScrollView
				ref={setScrollViewRef}
				style={[styles.container, style]}
				contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }, contentContainerStyle]}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				onScroll={handleScroll}
				scrollEventThrottle={16}
				onLayout={handleLayout}
				{...props}
			>
				{children}
			</ScrollView>
		)

		return (
			<KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} onFocus={handleFocus}>
				{shouldDismissOnTap ? (
					<TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
						{content}
					</TouchableWithoutFeedback>
				) : (
					content
				)}
			</KeyboardAvoidingView>
		)
	}
)

export interface KeyboardSafeFlatListProps extends FlatListProps<any> {
	/**
	 * Offset padding (in pixels) added between the focused input field and the virtual keyboard.
	 * @default 60
	 */
	bottomOffset?: number

	/**
	 * Alias for bottomOffset.
	 */
	extraScrollHeight?: number

	/**
	 * Tapping outside active inputs dismisses the keyboard.
	 * @default true
	 */
	dismissKeyboardOnTap?: boolean

	/**
	 * Alias for dismissKeyboardOnTap.
	 */
	dismissKeyboardOnTapOutside?: boolean
}

/**
 * Reusable list wrapper component that ensures virtual keyboard safety for text input elements
 * rendered as list headers, list items, or list footers.
 */
export const KeyboardSafeFlatList = forwardRef<FlatList<any>, KeyboardSafeFlatListProps>(
	({ style, contentContainerStyle, bottomOffset = 60, extraScrollHeight, dismissKeyboardOnTap = true, dismissKeyboardOnTapOutside = true, onScroll, onLayout, onFocus, ...props }, ref) => {
		const insets = useSafeAreaInsets()
		const localFlatListRef = useRef<FlatList<any> | null>(null)

		// Combine local and forwarded refs
		const setFlatListRef = useCallback(
			(node: FlatList<any> | null) => {
				localFlatListRef.current = node
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

		const offset = extraScrollHeight !== undefined ? extraScrollHeight : bottomOffset
		const shouldDismissOnTap = dismissKeyboardOnTap && dismissKeyboardOnTapOutside
		const [viewportHeight, setViewportHeight] = useState(0)
		const scrollYRef = useRef(0)

		// Web fallback
		if (Platform.OS === 'web') {
			return <FlatList ref={ref} style={[styles.container, style]} contentContainerStyle={contentContainerStyle} keyboardShouldPersistTaps="handled" {...props} />
		}

		const scrollToFocusedInput = () => {
			setTimeout(() => {
				if (!localFlatListRef.current || viewportHeight <= 0) return

				const inputNode = TextInput.State.currentlyFocusedInput()
				if (!inputNode) return

				const flatListHandle = findNodeHandle(localFlatListRef.current as any)
				const inputHandle = findNodeHandle(inputNode as any)

				if (flatListHandle && inputHandle) {
					UIManager.measureLayout(
						inputHandle,
						flatListHandle,
						() => {},
						(left, top, width, height) => {
							const currentScrollY = scrollYRef.current
							const visibleBottom = currentScrollY + viewportHeight
							const inputBottom = top + height

							if (inputBottom + offset > visibleBottom) {
								const targetY = inputBottom + offset - viewportHeight
								localFlatListRef.current?.scrollToOffset({
									offset: targetY,
									animated: true
								})
							} else if (top - 20 < currentScrollY) {
								const targetY = Math.max(0, top - 20)
								localFlatListRef.current?.scrollToOffset({
									offset: targetY,
									animated: true
								})
							}
						}
					)
				}
			}, 120)
		}

		useEffect(() => {
			const showSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => {
				scrollToFocusedInput()
			})
			return () => {
				showSubscription.remove()
			}
		}, [viewportHeight, offset])

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

		const content = (
			<FlatList
				ref={setFlatListRef}
				style={[styles.container, style]}
				contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }, contentContainerStyle]}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				onScroll={handleScroll}
				scrollEventThrottle={16}
				onLayout={handleLayout}
				{...props}
			/>
		)

		return (
			<KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} onFocus={handleFocus}>
				{shouldDismissOnTap ? (
					<TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
						{content}
					</TouchableWithoutFeedback>
				) : (
					content
				)}
			</KeyboardAvoidingView>
		)
	}
)

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	scrollContent: {
		flexGrow: 1
	}
})
