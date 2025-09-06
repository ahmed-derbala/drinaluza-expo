import { StyleSheet, TextStyle, ViewStyle, ImageStyle } from 'react-native'
import { ThemeColors } from '@/contexts/ThemeContext'

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle }

export const createThemedStyles = <T extends NamedStyles<T>>(styleFunction: (colors: ThemeColors) => T) => {
	return (colors: ThemeColors) => StyleSheet.create(styleFunction(colors))
}

// Common themed styles that can be reused
export const commonThemedStyles = (colors: ThemeColors) => ({
	container: {
		flex: 1,
		backgroundColor: colors.background
	} as ViewStyle,

	card: {
		backgroundColor: colors.card,
		borderRadius: 8,
		padding: 16,
		marginVertical: 8,
		borderWidth: 1,
		borderColor: colors.border
	} as ViewStyle,

	button: {
		backgroundColor: colors.button,
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center'
	} as ViewStyle,

	buttonText: {
		color: colors.buttonText,
		fontSize: 16,
		fontWeight: '600'
	} as TextStyle,

	input: {
		backgroundColor: colors.input,
		borderWidth: 1,
		borderColor: colors.inputBorder,
		borderRadius: 8,
		padding: 12,
		fontSize: 16,
		color: colors.text
	} as TextStyle,

	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: colors.text,
		marginBottom: 16
	} as TextStyle,

	subtitle: {
		fontSize: 18,
		fontWeight: '600',
		color: colors.text,
		marginBottom: 12
	} as TextStyle,

	text: {
		fontSize: 16,
		color: colors.text
	} as TextStyle,

	textSecondary: {
		fontSize: 14,
		color: colors.textSecondary
	} as TextStyle,

	modalOverlay: {
		flex: 1,
		backgroundColor: colors.modalOverlay,
		justifyContent: 'center',
		alignItems: 'center'
	} as ViewStyle,

	modalContent: {
		backgroundColor: colors.modal,
		borderRadius: 12,
		padding: 20,
		width: '90%',
		maxWidth: 400,
		borderWidth: 1,
		borderColor: colors.border
	} as ViewStyle
})
