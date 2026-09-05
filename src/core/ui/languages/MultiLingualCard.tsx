import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@theme'
import { useUser } from '@contexts/UserContext'
import { BaseCard } from '@cards/BaseCard'
import { SaveButton, CancelButton } from '@buttons'
import { SectionRow } from '@ui/sections/SectionRow'
import MultiLingualForm from './MultiLingualForm'
import { LanguageIcon } from './LanguageIcon'
import type { LanguageCode } from './languages.constants'
import type { MultiLang } from './languages.types'

interface MultiLingualCardProps {
	name?: MultiLang
	isEditing: boolean
	onEdit?: () => void
	onSave?: () => void
	onCancel?: () => void
	onChange: (lang: LanguageCode, value: string) => void
	title?: React.ReactNode
}

export function MultiLingualCard({ name, isEditing, onEdit, onSave, onCancel, onChange, title }: MultiLingualCardProps) {
	const { colors } = useTheme()
	const { translate, contentLang } = useUser()

	// Show mode displays only the saved content language (same fallback as localize: contentLang → en).
	const resolvedCode: LanguageCode | undefined = name?.[contentLang as LanguageCode] ? (contentLang as LanguageCode) : name?.en ? 'en' : undefined
	const displayValue = resolvedCode ? (name?.[resolvedCode] ?? '') : ''

	// Editing without save/cancel handlers (e.g. create screens with a single
	// submit) shows no action buttons — submit is handled externally.
	const mode = isEditing ? 'form' : onEdit ? 'edit' : 'view'
	const formActions =
		isEditing && (onSave || onCancel) ? (
			<>
				{onCancel ? <CancelButton onPress={onCancel} /> : null}
				{onSave ? <SaveButton onPress={onSave} /> : null}
			</>
		) : null

	return (
		<BaseCard title={title ?? translate('name', 'Name')} iconName="language" mode={mode} onEdit={onEdit} headerRight={formActions}>
			{isEditing ? (
				<MultiLingualForm
					nameEn={name?.en || ''}
					setNameEn={(value) => onChange('en', value)}
					nameTnLatn={name?.tn_latn || ''}
					setNameTnLatn={(value) => onChange('tn_latn', value)}
					nameTnArab={name?.tn_arab || ''}
					setNameTnArab={(value) => onChange('tn_arab', value)}
				/>
			) : displayValue && resolvedCode ? (
				<SectionRow
					value={
						<View style={styles.row}>
							<LanguageIcon code={resolvedCode} />
							<Text style={[styles.value, { color: colors.text }, resolvedCode === 'tn_arab' && { textAlign: 'right', flex: 1 }]}>{displayValue}</Text>
						</View>
					}
				/>
			) : (
				<Text style={[styles.empty, { color: colors.textTertiary }]}>{translate('no_name_info', 'No name information set.')}</Text>
			)}
		</BaseCard>
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

export default MultiLingualCard
