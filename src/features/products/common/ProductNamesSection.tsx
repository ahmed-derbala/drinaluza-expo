import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import MultiLingualInput from '@/features/common/languages/MultiLingualInput'
import { IconButton } from '@/features/common/buttons/IconButton'
import { BaseCard } from '@/features/common/cards/BaseCard'

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

	if (variant === 'create' || variant === 'edit') {
		const isEditing = variant === 'edit'
		return (
			<BaseCard title={translate('names', 'Names')} mode={isEditing ? 'edit' : 'view'} onSave={onSavePress} onCancel={onCancelPress}>
				<MultiLingualInput nameEn={nameEn} setNameEn={setNameEn} nameTnLatn={nameTnLatn} setNameTnLatn={setNameTnLatn} nameTnArab={nameTnArab} setNameTnArab={setNameTnArab} />
			</BaseCard>
		)
	}

	// view mode
	const mainName = React.useMemo(() => (productNameObj && localize ? localize(productNameObj) : productNameEn || ''), [productNameObj, localize, productNameEn])

	const otherNames = React.useMemo(() => {
		const candidates = productNameObj ? [productNameObj.en, productNameObj.tn_latn, productNameObj.tn_arab] : [productNameEn, productNameTnLatn, productNameTnArab]
		return Array.from(new Set(candidates.filter((n): n is string => Boolean(n) && n !== mainName)))
	}, [productNameObj, productNameEn, productNameTnLatn, productNameTnArab, mainName])

	return (
		<View style={styles.viewRow}>
			<View style={styles.flexItem}>
				<Text style={[styles.productName, { color: colors.text }]}>{mainName}</Text>
				{otherNames.length > 0 && <Text style={[styles.productNameSecondary, { color: colors.textSecondary }]}>{otherNames.join(' • ')}</Text>}
			</View>
			{canEdit && onEditPress && <IconButton icon="create-outline" label={translate('edit', 'Edit')} onPress={onEditPress} style={styles.actionBtn} />}
		</View>
	)
}

const createStyles = (colors: any) =>
	StyleSheet.create({
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
