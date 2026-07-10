import React from 'react'
import { View } from 'react-native'
import LocalizedFormInput from './LocalizedFormInput'
import { useUser } from '@/core/contexts/UserContext'

export interface MultilingualNameInputProps {
	nameEn: string
	setNameEn: (text: string) => void
	nameTnLatn: string
	setNameTnLatn: (text: string) => void
	nameTnArab: string
	setNameTnArab: (text: string) => void
	required?: boolean
	labelPrefix?: string
}

export default function MultilingualNameInput({ nameEn, setNameEn, nameTnLatn, setNameTnLatn, nameTnArab, setNameTnArab, required = true, labelPrefix = '' }: MultilingualNameInputProps) {
	const { translate } = useUser()

	const enLabel = labelPrefix ? `${labelPrefix} (${translate('english', 'English')})` : translate('english_name', 'English Name')

	const tnLatnLabel = labelPrefix ? `${labelPrefix} (${translate('tunisian_latin', 'Tunisian Latin')})` : translate('tunisian_latin_name', 'Tunisian Name (Latin)')

	const tnArabLabel = labelPrefix ? `${labelPrefix} (${translate('tunisian_arabic', 'Tunisian Arabic')})` : translate('tunisian_arabic_name', 'Tunisian Name (Arabic)')

	return (
		<View style={{ gap: 12, width: '100%' }}>
			<LocalizedFormInput
				label={enLabel}
				value={nameEn}
				onChangeText={setNameEn}
				lang="en"
				placeholder={translate('placeholder_name_en', 'Name in English')}
				required={required}
				style={{ marginBottom: 0 }}
			/>
			<LocalizedFormInput
				label={tnLatnLabel}
				value={nameTnLatn}
				onChangeText={setNameTnLatn}
				lang="tn_latn"
				placeholder={translate('placeholder_name_tn_latn', 'Name in Tunisian (Latin)')}
				style={{ marginBottom: 0 }}
			/>
			<LocalizedFormInput
				label={tnArabLabel}
				value={nameTnArab}
				onChangeText={setNameTnArab}
				lang="tn_arab"
				placeholder={translate('placeholder_name_tn_arab', 'الاسم بالعربية')}
				style={{ marginBottom: 0 }}
			/>
		</View>
	)
}
