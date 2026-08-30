import { View, Text, TextInput, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { IconButton } from '@/features/common/buttons/IconButton'
import { BaseCard } from '@/features/common/cards/BaseCard'

export interface ProductStockSectionProps {
	variant: 'view' | 'edit' | 'create'
	colors: any
	translate: (key: string, defaultValue?: string) => string
	// Editable values
	stockQuantity: string
	setStockQuantity: (v: string) => void
	minThreshold: string
	setMinThreshold: (v: string) => void
	// View values
	stockQuantityVal?: number
	minThresholdVal?: number
	// Inline Edit Actions
	canEdit?: boolean
	onEditPress?: () => void
	onSavePress?: () => void
	onCancelPress?: () => void
}

export default function ProductStockSection({
	variant,
	colors,
	translate,
	stockQuantity,
	setStockQuantity,
	minThreshold,
	setMinThreshold,
	stockQuantityVal = 0,
	minThresholdVal = 10,
	canEdit,
	onEditPress,
	onSavePress,
	onCancelPress
}: ProductStockSectionProps) {
	const styles = createStyles(colors)

	if (variant === 'create' || variant === 'edit') {
		const isEditing = variant === 'edit'
		return (
			<BaseCard title={translate('inventory', 'Inventory')} mode={isEditing ? 'edit' : 'view'} onSave={onSavePress} onCancel={onCancelPress}>
				<View style={styles.row}>
					<View style={styles.flexItem}>
						<Text style={styles.fieldLabel}>{translate('stock_quantity', 'Stock Quantity')}</Text>
						<View style={[styles.inputBox, { borderColor: colors.primary }]}>
							<TextInput style={[styles.textInput, { color: colors.text }]} value={stockQuantity} onChangeText={setStockQuantity} keyboardType="numeric" />
						</View>
					</View>
					<View style={{ width: 12 }} />
					<View style={styles.flexItem}>
						<Text style={styles.fieldLabel}>{translate('min_threshold', 'Min Threshold')}</Text>
						<View style={[styles.inputBox, { borderColor: colors.primary }]}>
							<TextInput style={[styles.textInput, { color: colors.text }]} value={minThreshold} onChangeText={setMinThreshold} keyboardType="numeric" />
						</View>
					</View>
				</View>
			</BaseCard>
		)
	}

	// view mode
	return (
		<View style={[styles.stockSection, { backgroundColor: colors.surfaceVariant }]}>
			{canEdit && onEditPress && (
				<View style={styles.editBtnContainer}>
					<IconButton icon="create-outline" label={translate('edit', 'Edit')} onPress={onEditPress} style={{ padding: 2 }} />
				</View>
			)}
			<View style={styles.stockRow}>
				<Ionicons name="cube-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
				<Text style={[styles.stockLabel, { color: colors.textSecondary }]}>{translate('stock_quantity', 'Stock Quantity')}</Text>
				<Text style={[styles.stockValue, { color: colors.text }]}>{stockQuantityVal}</Text>
			</View>
			<View style={[styles.stockRow, { marginBottom: 0 }]}>
				<Ionicons name="alert-circle-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
				<Text style={[styles.stockLabel, { color: colors.textSecondary }]}>{translate('min_threshold', 'Min Threshold')}</Text>
				<Text style={[styles.stockValue, { color: colors.text }]}>{minThresholdVal}</Text>
			</View>
		</View>
	)
}

const createStyles = (colors: any) =>
	StyleSheet.create({
		row: {
			flexDirection: 'row',
			marginBottom: 16
		},
		flexItem: {
			flex: 1
		},
		fieldLabel: {
			fontSize: 14,
			fontWeight: '700',
			color: colors.text,
			marginBottom: 8
		},
		inputBox: {
			height: 48,
			borderRadius: 12,
			borderWidth: 1.5,
			backgroundColor: colors.surfaceVariant,
			paddingHorizontal: 12,
			flexDirection: 'row',
			alignItems: 'center'
		},
		textInput: {
			flex: 1,
			fontSize: 16,
			height: '100%',
			padding: 0
		},
		stockSection: {
			borderRadius: 16,
			padding: 16,
			marginBottom: 20,
			gap: 12
		},
		editBtnContainer: {
			flexDirection: 'row',
			justifyContent: 'flex-end',
			position: 'absolute',
			top: 12,
			right: 12,
			zIndex: 10
		},
		stockRow: {
			flexDirection: 'row',
			alignItems: 'center'
		},
		stockLabel: {
			fontSize: 14,
			fontWeight: '500',
			flex: 1
		},
		stockValue: {
			fontSize: 15,
			fontWeight: '700'
		}
	})
