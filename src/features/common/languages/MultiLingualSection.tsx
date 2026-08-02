import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import { EditableSection, SectionRow } from '@/features/common/sections/EditableSection'
import MultiLingualInput from './MultiLingualInput'
import { LanguageIcon } from './LanguageIcon'
import type { LanguageCode } from './languages.constants'
import { LocalizedName } from '@/features/businesses/businesses.interface'

interface MultiLingualSectionProps {
	name?: LocalizedName
	isEditing: boolean
	onEdit: () => void
	onSave: () => void
	onCancel: () => void
	onChange: (lang: LanguageCode, value: string) => void
	title?: React.ReactNode
}

export function MultiLingualSection({ name, isEditing, onEdit, onSave, onCancel, onChange, title }: MultiLingualSectionProps) {
	const { colors } = useTheme()
	const { translate } = useUser()

	return (
		<EditableSection title={title ?? translate('name', 'Name')} iconName="language" isEditing={isEditing} onEdit={onEdit} onSave={onSave} onCancel={onCancel}>
			{isEditing ? (
				<MultiLingualInput
					nameEn={name?.en || ''}
					setNameEn={(value) => onChange('en', value)}
					nameTnLatn={name?.tn_latn || ''}
					setNameTnLatn={(value) => onChange('tn_latn', value)}
					nameTnArab={name?.tn_arab || ''}
					setNameTnArab={(value) => onChange('tn_arab', value)}
				/>
			) : (
				<>
					{name?.tn_arab && (
						<SectionRow
							value={
								<View style={styles.row}>
									<LanguageIcon code="tn_arab" />
									<Text style={[styles.value, { color: colors.text, textAlign: 'right', flex: 1 }]}>{name.tn_arab}</Text>
								</View>
							}
						/>
					)}
					{name?.tn_latn && (
						<SectionRow
							value={
								<View style={styles.row}>
									<LanguageIcon code="tn_latn" />
									<Text style={[styles.value, { color: colors.text }]}>{name.tn_latn}</Text>
								</View>
							}
						/>
					)}
					{name?.en && (
						<SectionRow
							value={
								<View style={styles.row}>
									<LanguageIcon code="en" />
									<Text style={[styles.value, { color: colors.text }]}>{name.en}</Text>
								</View>
							}
						/>
					)}
					{!name?.en && !name?.tn_arab && !name?.tn_latn && <Text style={[styles.empty, { color: colors.textTertiary }]}>{translate('no_name_info', 'No name information set.')}</Text>}
				</>
			)}
		</EditableSection>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8
	},
	value: {
		fontSize: 16,
		fontWeight: '500'
	},
	empty: {
		fontStyle: 'italic',
		padding: 8
	}
})

export default MultiLingualSection
