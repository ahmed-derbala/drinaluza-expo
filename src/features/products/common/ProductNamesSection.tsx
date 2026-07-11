import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import MultilingualNameInput from '@/features/common/MultilingualNameInput'

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
						{onCancelPress && (
							<TouchableOpacity onPress={onCancelPress} style={styles.actionBtn}>
								<Ionicons name="close-circle-outline" size={22} color={colors.error || '#EF4444'} />
							</TouchableOpacity>
						)}
						{onSavePress && (
							<TouchableOpacity onPress={onSavePress} style={styles.actionBtn}>
								<Ionicons name="checkmark-circle" size={22} color={colors.success || '#10B981'} />
							</TouchableOpacity>
						)}
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
			{canEdit && onEditPress && (
				<TouchableOpacity onPress={onEditPress} style={styles.actionBtn} activeOpacity={0.7}>
					<Ionicons name="create-outline" size={20} color={colors.primary} />
				</TouchableOpacity>
			)}
		</View>
	)
}

const createStyles = (colors: any) =>
	StyleSheet.create({
		card: {
			backgroundColor: colors.card,
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
			borderBottomColor: colors.borderLight,
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
			borderBottomColor: colors.borderLight,
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
