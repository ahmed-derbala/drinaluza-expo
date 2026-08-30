import { View } from 'react-native'
import LocalizedFormInput from '@/features/common/LocalizedFormInput'
import { useUser } from '@/core/contexts/UserContext'

export interface MultiLingualInputProps {
	nameEn: string
	setNameEn: (text: string) => void
	nameTnLatn: string
	setNameTnLatn: (text: string) => void
	nameTnArab: string
	setNameTnArab: (text: string) => void
	required?: boolean
}

export default function MultiLingualInput({ nameEn, setNameEn, nameTnLatn, setNameTnLatn, nameTnArab, setNameTnArab, required = true }: MultiLingualInputProps) {
	const { translate } = useUser()

	return (
		<View style={{ gap: 12, width: '100%' }}>
			<LocalizedFormInput value={nameTnArab} onChangeText={setNameTnArab} lang="tn_arab" placeholder={translate('placeholder_name_tn_arab', 'الاسم بالعربية')} style={{ marginBottom: 0 }} />
			<LocalizedFormInput value={nameTnLatn} onChangeText={setNameTnLatn} lang="tn_latn" placeholder={translate('placeholder_name_tn_latn', 'Name in Tunisian (Latin)')} style={{ marginBottom: 0 }} />
			<LocalizedFormInput value={nameEn} onChangeText={setNameEn} lang="en" placeholder={translate('placeholder_name_en', 'Name in English')} required={required} style={{ marginBottom: 0 }} />
		</View>
	)
}
