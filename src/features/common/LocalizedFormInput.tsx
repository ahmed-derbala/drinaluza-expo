import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native'
import { useTheme, colors as themeColors } from '@/core/theme'
import { LanguageIcon } from '@/features/common/languages'

export interface LocalizedFormInputProps {
	/**
	 * Form field label text.
	 */
	label?: string
	/**
	 * TextInput value.
	 */
	value: string
	/**
	 * Callback function triggered when text changes.
	 */
	onChangeText: (text: string) => void
	/**
	 * Localized language configuration.
	 */
	lang: 'en' | 'tn_latn' | 'tn_arab'
	/**
	 * Optional custom input placeholder.
	 */
	placeholder?: string
	/**
	 * Whether the field is mandatory. Defaults to false.
	 */
	required?: boolean
	/**
	 * Whether the field is multiline. Defaults to false.
	 */
	multiline?: boolean
	/**
	 * Optional custom style for the outer field container.
	 */
	style?: object
}

const LocalizedFormInput: React.FC<LocalizedFormInputProps> = ({ label, value, onChangeText, lang, placeholder, required = false, multiline = false, style }) => {
	const { colors } = useTheme()
	const [isFocused, setIsFocused] = useState(false)

	const isRtl = lang === 'tn_arab'

	return (
		<View style={[styles.fieldContainer, style]}>
			{label && (
				<Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
					{label} {required && <Text style={styles.required}>*</Text>}
				</Text>
			)}

			<View
				style={[
					styles.inputBox,
					{
						backgroundColor: colors.background,
						borderColor: isFocused ? colors.primary : colors.border,
						height: multiline ? 96 : 48
					}
				]}
			>
				{/* Flag Prefix Badge */}
				<View style={[styles.badgeContainer, { backgroundColor: colors.text + '05', borderRightColor: colors.border + '20' }]}>
					<LanguageIcon code={lang} size={18} />
				</View>

				{/* Input */}
				<TextInput
					style={[
						styles.textInput,
						{
							color: colors.text,
							textAlign: isRtl ? 'right' : 'left',
							textAlignVertical: multiline ? 'top' : 'center',
							paddingTop: multiline ? 12 : 0
						}
					]}
					value={value}
					onChangeText={onChangeText}
					placeholder={placeholder}
					placeholderTextColor={colors.textTertiary}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
					multiline={multiline}
					numberOfLines={multiline ? 4 : 1}
					underlineColorAndroid="transparent"
					autoCorrect={false}
				/>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	fieldContainer: {
		marginBottom: 16,
		width: '100%'
	},
	fieldLabel: {
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 8
	},
	required: {
		color: themeColors.error
	},
	inputBox: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1.5,
		borderRadius: 12,
		overflow: 'hidden'
	},
	badgeContainer: {
		width: 48,
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
		borderRightWidth: 1,
		flexDirection: 'row',
		gap: 2
	},
	textInput: {
		flex: 1,
		fontSize: 16,
		paddingHorizontal: 12,
		height: '100%',
		paddingVertical: 0
	}
})

export default React.memo(LocalizedFormInput)
