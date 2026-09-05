import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet } from 'react-native'
import { BaseForm } from '@forms/BaseForm'
import { useTheme, themeColors } from '@theme'
import { LanguageIcon } from './LanguageIcon'
import { useUser } from '@contexts/UserContext'

export interface MultiLingualFormProps {
	nameEn: string
	setNameEn: (text: string) => void
	nameTnLatn: string
	setNameTnLatn: (text: string) => void
	nameTnArab: string
	setNameTnArab: (text: string) => void
	required?: boolean
	placeholderEn?: string
	placeholderTnLatn?: string
	placeholderTnArab?: string
}

function LangedInput({
	value,
	onChangeText,
	lang,
	placeholder,
	required = false
}: {
	value: string
	onChangeText: (text: string) => void
	lang: 'en' | 'tn_latn' | 'tn_arab'
	placeholder?: string
	required?: boolean
}) {
	const { colors } = useTheme()
	const [isFocused, setIsFocused] = useState(false)
	const isRtl = lang === 'tn_arab'
	return (
		<View style={styles.fieldContainer}>
			<View
				style={[
					styles.inputBox,
					{
						backgroundColor: colors.background,
						borderColor: isFocused ? colors.primary : colors.border
					}
				]}
			>
				<View style={[styles.badgeContainer, { backgroundColor: colors.text + '05', borderRightColor: colors.border + '20' }]}>
					<LanguageIcon code={lang} size={18} />
				</View>
				<TextInput
					style={[
						styles.textInput,
						{
							color: colors.text,
							textAlign: isRtl ? 'right' : 'left'
						}
					]}
					value={value}
					onChangeText={onChangeText}
					placeholder={placeholder}
					placeholderTextColor={colors.textTertiary}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
					underlineColorAndroid="transparent"
					autoCorrect={false}
				/>
			</View>
		</View>
	)
}

export default function MultiLingualForm({
	nameEn,
	setNameEn,
	nameTnLatn,
	setNameTnLatn,
	nameTnArab,
	setNameTnArab,
	required = true,
	placeholderEn,
	placeholderTnLatn,
	placeholderTnArab
}: MultiLingualFormProps) {
	const { translate } = useUser()

	return (
		<BaseForm>
			<LangedInput value={nameTnArab} onChangeText={setNameTnArab} lang="tn_arab" placeholder={placeholderTnArab ?? translate('placeholder_name_tn_arab', 'الاسم بالعربية')} />
			<LangedInput value={nameTnLatn} onChangeText={setNameTnLatn} lang="tn_latn" placeholder={placeholderTnLatn ?? translate('placeholder_name_tn_latn', 'Name in Tunisian (Latin)')} />
			<LangedInput value={nameEn} onChangeText={setNameEn} lang="en" placeholder={placeholderEn ?? translate('placeholder_name_en', 'Name in English')} required={required} />
		</BaseForm>
	)
}

const styles = StyleSheet.create({
	fieldContainer: {
		width: '100%'
	},
	inputBox: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1.5,
		borderRadius: 12,
		overflow: 'hidden',
		height: 48
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
