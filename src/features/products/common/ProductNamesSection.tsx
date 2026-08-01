import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import MultilingualNameInput from '@/features/common/MultilingualNameInput'
import { IconButton } from '@/features/common/buttons/IconButton'
import { CancelButton } from '@/features/common/buttons/CancelButton'

export interface ProductNamesSectionProps {
	variant: 'view' | 'edit' | 'create'
	colors: any
	translate: (key: string, defaultValue?: string) => string
	// Editable values
	nameEn: string
	setNameEn: (v: string) => void
	nameTnLatn: string
	setNameTnLatn: (v: string) => void
	nameTnArab: string
	setNameTnArab: (v: string) => void
	// View values
	productNameEn?: string
	productNameTnLatn?: string
	productNameTnArab?: string
	localize?: (multilingualObj: any) => string
	productNameObj?: any // Fallback multilingual object
	// Inline Edit Actions
	canEdit?: boolean
	onEditPress?: () => void
	onSavePress?: () => void
	onCancelPress?: () => void
}

export default function ProductNamesSection({
	variant,
	colors,
	translate,
	nameEn,
	setNameEn,
	nameTnLatn,
	setNameTnLatn,
	nameTnArab,
	setNameTnArab,
	productNameEn,
	productNameTnLatn,
	productNameTnArab,
	localize,
	productNameObj,
	canEdit,
	onEditPress,
	onSavePress,
	onCancelPress
}: ProductNamesSectionProps) {
	const styles = createStyles(colors)

	if (variant === 'create') {
		return (
			<View style={styles.card}>
				<Text style={styles.cardTitle}>{translate('names', 'Names')}</Text>
				<MultilingualNameInput nameEn={nameEn} setNameEn={setNameEn} nameTnLatn={nameTnLatn} setNameTnLatn={setNameTnLatn} nameTnArab={nameTnArab} setNameTnArab={setNameTnArab} />
			</View>
		)
	}

	if (variant === 'edit') {
		return (
			<View style={styles.editSection}>
				<View style={styles.editHeader}>
					<Text style={styles.cardTitle}>{translate('names', 'Names')}</Text>
					<View style={styles.actionButtons}>
						{onCancelPress && <CancelButton onPress={onCancelPress} style={styles.actionBtn} />}
						{onSavePress && <IconButton icon="checkmark-circle" label={translate('save', 'Save')} onPress={onSavePress} variant="success" colors={colors} style={styles.actionBtn} />}
					</View>
				</View>
				<MultilingualNameInput nameEn={nameEn} setNameEn={setNameEn} nameTnLatn={nameTnLatn} setNameTnLatn={setNameTnLatn} nameTnArab={nameTnArab} setNameTnArab={setNameTnArab} />
			</View>
		)
	}

	// view mode
	const displayName = productNameEn || (productNameObj && localize ? localize(productNameObj) : '')
	const tnLatn = productNameTnLatn || productNameObj?.tn_latn
	const tnArab = productNameTnArab || productNameObj?.tn_arab

	return (
		<View style={styles.viewRow}>
			<View style={styles.flexItem}>
				<Text style={[styles.productName, { color: colors.text }]}>{displayName}</Text>
				{(tnLatn || tnArab) && (
					<Text style={[styles.productNameSecondary, { color: colors.textSecondary }]}>
						{tnLatn} {tnArab && `• ${tnArab}`}
					</Text>
				)}
			</View>
			{canEdit && onEditPress && <IconButton icon="create-outline" label={translate('edit', 'Edit')} onPress={onEditPress} colors={colors} style={styles.actionBtn} />}
		</View>
	)
}

const createStyles = (colors: any) =>
	StyleSheet.create({
		card: {
			backgroundColor: colors.background,
			borderRadius: 16,
			padding: 16,
			marginBottom: 16,
			borderWidth: 1,
			borderColor: colors.border
		},
		cardTitle: {
			fontSize: 16,
			fontWeight: '700',
			color: colors.text,
			marginBottom: 16
		},
		editSection: {
			borderBottomWidth: 1,
			borderBottomColor: colors.border,
			paddingBottom: 16,
			marginBottom: 16
		},
		editHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: 12
		},
		actionButtons: {
			flexDirection: 'row',
			gap: 12
		},
		actionBtn: {
			padding: 4
		},
		viewRow: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'flex-start',
			gap: 12,
			borderBottomWidth: 1,
			borderBottomColor: colors.border,
			paddingBottom: 12,
			marginBottom: 16
		},
		flexItem: {
			flex: 1
		},
		productName: {
			fontSize: 28,
			fontWeight: '800',
			letterSpacing: -0.5,
			marginBottom: 6
		},
		productNameSecondary: {
			fontSize: 14,
			fontWeight: '500',
			marginBottom: 4
		}
	})
