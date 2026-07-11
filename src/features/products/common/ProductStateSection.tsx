import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export interface ProductStateSectionProps {
	variant: 'view' | 'edit'
	colors: any
	translate: (key: string, defaultValue?: string) => string
	// Editable values
	productState: 'active' | 'pending' | 'suspended'
	setProductState: (v: 'active' | 'pending' | 'suspended') => void
	// View values
	isAvailable?: boolean
	stateCode?: string
	// Inline Edit Actions
	canEdit?: boolean
	onEditPress?: () => void
	onSavePress?: () => void
	onCancelPress?: () => void
}

export default function ProductStateSection({
	variant,
	colors,
	translate,
	productState,
	setProductState,
	isAvailable = true,
	stateCode = 'active',
	canEdit,
	onEditPress,
	onSavePress,
	onCancelPress
}: ProductStateSectionProps) {
	const styles = createStyles(colors)

	if (variant === 'edit') {
		return (
			<View style={styles.editSection}>
				<View style={styles.editHeader}>
					<Text style={styles.cardTitle}>{translate('state', 'State')}</Text>
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
				<View style={styles.row}>
					<TouchableOpacity
						style={[
							styles.inputBox,
							{
								flex: 1,
								justifyContent: 'center',
								borderColor: productState === 'active' ? colors.success : colors.borderLight,
								backgroundColor: productState === 'active' ? `${colors.success}15` : colors.surface,
								flexDirection: 'row',
								gap: 6
							}
						]}
						onPress={() => setProductState('active')}
					>
						<View style={[styles.dot, { backgroundColor: colors.success }]} />
						<Text style={{ color: productState === 'active' ? colors.success : colors.text, fontWeight: '700' }}>{translate('active', 'Active')}</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[
							styles.inputBox,
							{
								flex: 1,
								justifyContent: 'center',
								borderColor: productState === 'suspended' ? colors.error : colors.borderLight,
								backgroundColor: productState === 'suspended' ? `${colors.error}15` : colors.surface,
								flexDirection: 'row',
								gap: 6
							}
						]}
						onPress={() => setProductState('suspended')}
					>
						<View style={[styles.dot, { backgroundColor: colors.error }]} />
						<Text style={{ color: productState === 'suspended' ? colors.error : colors.text, fontWeight: '700' }}>{translate('suspended', 'Suspended')}</Text>
					</TouchableOpacity>
				</View>
			</View>
		)
	}

	// view mode
	return (
		<View style={styles.statusRow}>
			<View style={styles.statusLabelContainer}>
				<Text style={styles.statusLabel}>{translate('state', 'State')}</Text>
				{canEdit && onEditPress && (
					<TouchableOpacity onPress={onEditPress} style={{ padding: 2 }} activeOpacity={0.7}>
						<Ionicons name="create-outline" size={16} color={colors.primary} />
					</TouchableOpacity>
				)}
			</View>
			<View style={[styles.statusBadgeTouch, { backgroundColor: isAvailable ? `${colors.success}15` : `${colors.error}15` }]}>
				<Text style={[styles.statusText, { color: isAvailable ? colors.success : colors.error }]}>{stateCode === 'active' ? translate('active', 'Active') : translate('inactive', 'Inactive')}</Text>
			</View>
		</View>
	)
}

const createStyles = (colors: any) =>
	StyleSheet.create({
		cardTitle: {
			fontSize: 16,
			fontWeight: '700',
			color: colors.text,
			marginBottom: 16
		},
		editSection: {
			paddingBottom: 16
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
		row: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 12
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
		dot: {
			width: 8,
			height: 8,
			borderRadius: 4
		},
		statusRow: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			paddingVertical: 14,
			borderBottomWidth: 1,
			borderBottomColor: colors.borderLight
		},
		statusLabelContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 6
		},
		statusLabel: {
			fontSize: 14,
			fontWeight: '500'
		},
		statusBadgeTouch: {
			paddingHorizontal: 12,
			paddingVertical: 6,
			borderRadius: 20
		},
		statusText: {
			fontSize: 12,
			fontWeight: '700',
			textTransform: 'uppercase',
			letterSpacing: 0.5
		}
	})
