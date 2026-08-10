import React, { useCallback, useMemo } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { IconButton } from './buttons/IconButton'
import { DeleteButton } from './buttons/DeleteButton'

import { useTheme, themeColors } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import type { Contact, Phone } from '@/features/profile/profile.interface'

interface ContactFormProps {
	contact?: Contact
	phone?: Phone
	backupPhones?: Phone[]
	email?: string
	whatsapp?: string
	onChange?: (contact: Contact) => void
}

export default function ContactForm({ contact, phone, backupPhones, email, whatsapp, onChange }: ContactFormProps) {
	const { colors } = useTheme()
	const { translate } = useUser()

	const DEFAULT_COUNTRY = '216'

	const normalizePhone = (value?: Phone): Phone => {
		if (!value) return { countryCode: DEFAULT_COUNTRY, localNumber: '', shortNumber: '' }
		let countryCode = value.countryCode?.replace(/^\+/, '') || ''
		let localNumber = value.localNumber || value.shortNumber || ''
		if (!countryCode && value.fullNumber) {
			const match = value.fullNumber.match(/^(\+\d{1,4})(.*)$/)
			countryCode = match ? match[1].replace(/^\+/, '') : ''
		}
		if (!localNumber && value.fullNumber) {
			const match = value.fullNumber.match(/^(\+\d{1,4})(.*)$/)
			localNumber = match ? match[2] : value.fullNumber
		}
		return { ...value, countryCode: countryCode || DEFAULT_COUNTRY, localNumber, shortNumber: localNumber }
	}

	const currentPhone = useMemo(() => normalizePhone(contact?.phone || phone), [contact?.phone, phone])
	const currentBackups = useMemo(() => (contact?.backupPhones || backupPhones || []).map(normalizePhone), [contact?.backupPhones, backupPhones])
	const currentEmail = contact?.email || email || ''
	const currentWhatsapp = contact?.whatsapp || whatsapp || ''

	const updatePhone = useCallback(
		(type: 'primary' | 'backup', field: 'countryCode' | 'localNumber', value: string, index?: number) => {
			let cleanValue = value
			if (field === 'localNumber') {
				cleanValue = value.replace(/\D/g, '')
			} else {
				cleanValue = value.replace(/[^\d]/g, '').replace(/^\+/, '')
			}

			const countryCode = field === 'countryCode' ? cleanValue : currentPhone.countryCode || DEFAULT_COUNTRY
			const localNumber = field === 'localNumber' ? cleanValue : currentPhone.localNumber || currentPhone.shortNumber || ''
			const fullNumber = `+${countryCode || DEFAULT_COUNTRY}${localNumber || ''}`
			const newPhone = { ...currentPhone, countryCode: countryCode || DEFAULT_COUNTRY, localNumber, shortNumber: localNumber, fullNumber }

			if (type === 'primary') {
				onChange?.({ ...contact, phone: newPhone })
			} else {
				const backups = [...currentBackups]
				if (index === undefined) return
				backups[index] = newPhone
				onChange?.({ ...contact, backupPhones: backups })
			}
		},
		[contact, currentPhone, currentBackups, onChange]
	)

	const addBackupPhone = useCallback(() => {
		const backups = [...currentBackups, { countryCode: DEFAULT_COUNTRY, localNumber: '', shortNumber: '', fullNumber: `+${DEFAULT_COUNTRY}` }]
		onChange?.({ ...contact, backupPhones: backups })
	}, [contact, currentBackups, onChange])

	const removeBackupPhone = useCallback(
		(index: number) => {
			const backups = [...currentBackups]
			backups.splice(index, 1)
			onChange?.({ ...contact, backupPhones: backups })
		},
		[contact, currentBackups, onChange]
	)

	return (
		<>
			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>Primary Phone</Text>
				<View style={[styles.phoneInputContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
					<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05', width: 80 }]}>
						<TextInput
							style={[styles.phoneCodeInput, { color: colors.text }]}
							value={currentPhone?.countryCode ? `+${currentPhone.countryCode}` : '+216'}
							onChangeText={(value) => updatePhone('primary', 'countryCode', value)}
							placeholder="+216"
							placeholderTextColor={colors.textTertiary}
							keyboardType="phone-pad"
							maxLength={5}
						/>
					</View>
					<TextInput
						style={[styles.phoneNumberInput, { color: colors.text }]}
						value={currentPhone?.localNumber || ''}
						onChangeText={(value) => updatePhone('primary', 'localNumber', value)}
						placeholder="99112619"
						placeholderTextColor={colors.textTertiary}
						keyboardType="phone-pad"
						maxLength={15}
					/>
				</View>
			</View>

			{currentBackups.map((backupPhone, index) => (
				<View key={index} style={styles.inputGroup}>
					<Text style={styles.inputLabel}>Backup Phone {index + 1}</Text>
					<View style={styles.backupRow}>
						<View style={[styles.phoneInputContainer, { borderColor: colors.border, backgroundColor: colors.background, flex: 1 }]}>
							<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05', width: 80 }]}>
								<TextInput
									style={[styles.phoneCodeInput, { color: colors.text }]}
									value={backupPhone?.countryCode ? `+${backupPhone.countryCode}` : '+216'}
									onChangeText={(value) => updatePhone('backup', 'countryCode', value, index)}
									placeholder="+216"
									placeholderTextColor={colors.textTertiary}
									keyboardType="phone-pad"
									maxLength={5}
								/>
							</View>
							<TextInput
								style={[styles.phoneNumberInput, { color: colors.text }]}
								value={backupPhone?.localNumber || ''}
								onChangeText={(value) => updatePhone('backup', 'localNumber', value, index)}
								placeholder="99112645"
								placeholderTextColor={colors.textTertiary}
								keyboardType="phone-pad"
								maxLength={15}
							/>
						</View>
						<DeleteButton onPress={() => removeBackupPhone(index)} style={styles.deleteButton} />
					</View>
				</View>
			))}

			<IconButton icon="call-outline" label={translate('add_backup_phone', 'Add Backup Phone')} onPress={addBackupPhone} style={[styles.addButtonIcon, { borderColor: colors.primary }]} />

			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>Email</Text>
				<View style={[styles.socialInputContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
					<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05' }]}>
						<Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
					</View>
					<TextInput
						style={[styles.socialInput, { color: colors.text }]}
						value={currentEmail}
						onChangeText={(value) => onChange?.({ ...contact, email: value })}
						placeholder="email@example.com"
						placeholderTextColor={colors.textTertiary}
						keyboardType="email-address"
						autoCapitalize="none"
					/>
				</View>
			</View>

			<View style={styles.inputGroup}>
				<Text style={styles.inputLabel}>WhatsApp</Text>
				<View style={[styles.socialInputContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
					<View style={[styles.socialIconBadge, { backgroundColor: themeColors.whatsApp10 }]}>
						<Ionicons name="logo-whatsapp" size={20} color={themeColors.whatsApp} />
					</View>
					<TextInput
						style={[styles.socialInput, { color: colors.text }]}
						value={currentWhatsapp}
						onChangeText={(value) => onChange?.({ ...contact, whatsapp: value })}
						placeholder="+21699112618"
						placeholderTextColor={colors.textTertiary}
						keyboardType="phone-pad"
					/>
				</View>
			</View>
		</>
	)
}

const styles = StyleSheet.create({
	inputGroup: {
		marginBottom: 10,
		paddingHorizontal: 4
	},
	inputLabel: {
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 6,
		color: themeColors.textTertiary
	},
	phoneInputContainer: {
		flexDirection: 'row',
		alignItems: 'stretch',
		borderRadius: 10,
		borderWidth: 1,
		overflow: 'hidden',
		minHeight: 40
	},
	phoneCodeInput: {
		width: '100%',
		paddingHorizontal: 8,
		paddingVertical: 10,
		fontSize: 16,
		textAlign: 'center',
		textAlignVertical: 'center'
	},
	phoneNumberInput: {
		flex: 1,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 16,
		textAlignVertical: 'center'
	},
	socialInputContainer: {
		flexDirection: 'row',
		alignItems: 'stretch',
		borderRadius: 10,
		borderWidth: 1,
		overflow: 'hidden',
		minHeight: 40
	},
	socialIconBadge: {
		width: 40,
		alignItems: 'center',
		justifyContent: 'center',
		borderRightWidth: 1,
		borderRightColor: themeColors.textSecondary
	},
	socialInput: {
		flex: 1,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 16
	},
	inputHint: {
		fontSize: 12,
		marginTop: 4,
		marginLeft: 4
	},
	addButtonIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center',
		alignSelf: 'flex-end',
		marginTop: 4,
		marginBottom: 6
	},
	backupRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8
	},
	deleteButton: {
		width: 40,
		height: 40,
		justifyContent: 'center',
		alignItems: 'center'
	}
})
