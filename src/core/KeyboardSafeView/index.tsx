import React from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableWithoutFeedback, Keyboard, View, ViewStyle, ScrollViewProps } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export interface KeyboardSafeViewProps {
	children: React.ReactNode
	style?: ViewStyle
	contentContainerStyle?: ViewStyle
	scrollable?: boolean
	keyboardVerticalOffset?: number
	scrollViewProps?: Partial<ScrollViewProps>
}

export const KeyboardSafeView: React.FC<KeyboardSafeViewProps> = ({
	children,
	style,
	contentContainerStyle,
	scrollable = true,
	keyboardVerticalOffset = Platform.select({ ios: 64, android: 0 }),
	scrollViewProps = {}
}) => {
	const insets = useSafeAreaInsets()

	const containerStyle = [styles.container, style]
	const contentStyle = [styles.scrollContent, { paddingBottom: insets.bottom + 24 }, contentContainerStyle]

	const content = (
		<TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
			<View style={styles.innerContainer}>{children}</View>
		</TouchableWithoutFeedback>
	)

	return (
		<KeyboardAvoidingView style={containerStyle} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={keyboardVerticalOffset}>
			{scrollable ? (
				<ScrollView style={styles.scrollView} contentContainerStyle={contentStyle} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} {...scrollViewProps}>
					{content}
				</ScrollView>
			) : (
				<View style={[styles.innerContainer, { paddingBottom: insets.bottom + 24 }, contentContainerStyle]}>{content}</View>
			)}
		</KeyboardAvoidingView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	scrollView: {
		flex: 1
	},
	scrollContent: {
		flexGrow: 1
	},
	innerContainer: {
		flex: 1
	}
})
