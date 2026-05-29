import React, { forwardRef } from 'react'
import { ScrollView, FlatList, Platform, ScrollViewProps, FlatListProps, StyleSheet } from 'react-native'
import { KeyboardAwareScrollView, KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view'

export interface KeyboardSafeViewProps extends ScrollViewProps {
	/**
	 * Offset padding (in pixels) added between the focused input field and the virtual keyboard.
	 * Helps ensure helper text, borders, or submit CTA buttons remain visible.
	 * @default 60
	 */
	bottomOffset?: number
	children?: React.ReactNode
}

/**
 * Reusable layout wrapper component that ensures form inputs and fields are never overlapped
 * by the virtual keyboard on portrait mobile screens, with high-fidelity performance on Web.
 */
export const KeyboardSafeView = forwardRef<ScrollView, KeyboardSafeViewProps>(({ children, style, contentContainerStyle, bottomOffset = 60, ...props }, ref) => {
	// Clean fallback on Web viewports to optimize memory footprint and layout rendering
	if (Platform.OS === 'web') {
		return (
			<ScrollView ref={ref} style={[styles.container, style]} contentContainerStyle={contentContainerStyle} keyboardShouldPersistTaps="handled" {...props}>
				{children}
			</ScrollView>
		)
	}

	return (
		<KeyboardAwareScrollView
			// Access the ref of the underlying ScrollView safely
			// @ts-ignore - keyboard-aware-scroll-view ref typing
			innerRef={(innerRef) => {
				if (ref) {
					if (typeof ref === 'function') {
						ref(innerRef)
					} else {
						;(ref as any).current = innerRef
					}
				}
			}}
			style={[styles.container, style]}
			contentContainerStyle={contentContainerStyle}
			enableOnAndroid={true}
			enableAutomaticScroll={true}
			extraScrollHeight={bottomOffset}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
			{...props}
		>
			{children}
		</KeyboardAwareScrollView>
	)
})

/**
 * Reusable list wrapper component that ensures virtual keyboard safety for text input elements
 * rendered as list headers, list items, or list footers.
 */
export const KeyboardSafeFlatList = forwardRef<FlatList<any>, FlatListProps<any>>(({ style, contentContainerStyle, ...props }, ref) => {
	// Clean fallback on Web viewports to optimize memory footprint and layout rendering
	if (Platform.OS === 'web') {
		return <FlatList ref={ref} style={[styles.container, style]} contentContainerStyle={contentContainerStyle} keyboardShouldPersistTaps="handled" {...props} />
	}

	return (
		<KeyboardAwareFlatList
			// Access the ref of the underlying FlatList safely
			// @ts-ignore - keyboard-aware-scroll-view ref typing
			innerRef={(innerRef) => {
				if (ref) {
					if (typeof ref === 'function') {
						ref(innerRef)
					} else {
						;(ref as any).current = innerRef
					}
				}
			}}
			style={[styles.container, style]}
			contentContainerStyle={contentContainerStyle}
			enableOnAndroid={true}
			enableAutomaticScroll={true}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
			{...props}
		/>
	)
})

const styles = StyleSheet.create({
	container: {
		flex: 1
	}
})
