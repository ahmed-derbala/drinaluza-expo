import React, { memo } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type KeyboardAvoidingViewProps, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native'
import type { RefObject } from 'react'
import { SmartHeader } from '@/core/smart-header'

export interface KeyboardAvoidingWrapperProps {
	/** Children to render inside the wrapper */
	children: React.ReactNode

	/**
	 * Outer container style (applied to KeyboardAvoidingView).
	 * Defaults to `flex: 1`.
	 */
	style?: StyleProp<ViewStyle>

	/**
	 * Whether to wrap children in a ScrollView.
	 * Enables scrolling when the keyboard pushes content up.
	 * @default true
	 */
	scrollable?: boolean

	/**
	 * ScrollView content container style.
	 * Only applies when `scrollable` is true.
	 */
	contentContainerStyle?: StyleProp<ViewStyle>

	/**
	 * Props forwarded to the internal ScrollView.
	 * Only applies when `scrollable` is true.
	 */
	scrollViewProps?: Omit<ScrollViewProps, 'style' | 'contentContainerStyle'>

	/**
	 * Ref forwarded to the internal ScrollView.
	 * Allows imperative control (e.g. `scrollToEnd`) from the parent.
	 * Only applies when `scrollable` is true.
	 */
	scrollViewRef?: RefObject<ScrollView | null>

	/**
	 * Override the keyboard avoiding behavior.
	 * Defaults to `'padding'` on iOS and `'height'` on Android.
	 */
	behavior?: KeyboardAvoidingViewProps['behavior']

	/**
	 * Additional offset applied to the keyboard avoidance calculation.
	 * Useful when a fixed header/tab-bar is present.
	 * @default 0
	 */
	keyboardVerticalOffset?: number

	/**
	 * Whether the wrapper is enabled.
	 * Mirrors the `enabled` prop of KeyboardAvoidingView.
	 * @default true
	 */
	enabled?: boolean
}

/**
 * KeyboardAvoidingWrapper
 *
 * A drop-in, cross-platform wrapper that prevents the on-screen keyboard from
 * obscuring input fields. Wraps content in a `KeyboardAvoidingView` and,
 * optionally, a `ScrollView` so users can always reach every input.
 *
 * Usage (scrollable form):
 * ```tsx
 * <KeyboardAvoidingWrapper>
 *   <TextInput ... />
 *   <TextInput ... />
 * </KeyboardAvoidingWrapper>
 * ```
 *
 * Usage (non-scrollable, e.g. bottom-sheet content):
 * ```tsx
 * <KeyboardAvoidingWrapper scrollable={false} keyboardVerticalOffset={60}>
 *   <TextInput ... />
 * </KeyboardAvoidingWrapper>
 * ```
 */
const KeyboardAvoidingWrapper = memo(function KeyboardAvoidingWrapper({
	children,
	style,
	scrollable = true,
	contentContainerStyle,
	scrollViewProps,
	scrollViewRef,
	behavior,
	keyboardVerticalOffset = 0,
	enabled = true
}: KeyboardAvoidingWrapperProps) {
	// iOS: 'padding' moves the view up by the keyboard height.
	// Android: 'height' shrinks the view; avoids double-offset with windowSoftInputMode.
	// Web: behavior is irrelevant – KeyboardAvoidingView is a no-op there.
	const resolvedBehavior: KeyboardAvoidingViewProps['behavior'] = behavior ?? (Platform.OS === 'ios' ? 'padding' : undefined)

	return (
		<KeyboardAvoidingView style={[styles.flex, style]} behavior={resolvedBehavior} keyboardVerticalOffset={keyboardVerticalOffset} enabled={enabled}>
			{scrollable ? (
				<SmartHeader.ScrollView
					ref={scrollViewRef}
					style={styles.flex}
					contentContainerStyle={[styles.grow, contentContainerStyle]}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
					{...scrollViewProps}
				>
					{children}
				</SmartHeader.ScrollView>
			) : (
				<View style={styles.flex}>{children}</View>
			)}
		</KeyboardAvoidingView>
	)
})

const styles = StyleSheet.create({
	flex: {
		flex: 1
	},
	grow: {
		flexGrow: 1
	}
})

export default KeyboardAvoidingWrapper
