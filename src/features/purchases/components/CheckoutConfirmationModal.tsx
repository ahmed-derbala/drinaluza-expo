import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import { CenteredModal } from '@/core/smart-modal'
import { useTheme } from '@/core/theme'
import { useUser } from '@/core/contexts'
import { CancelButton } from '@/features/common/buttons/CancelButton'
import { EyeButton } from '@/features/common/buttons/EyeButton'
import { IconButton } from '@/features/common/buttons/IconButton'
import { updateMyProfile } from '@/features/auth/auth.api'
import { useMyProfile } from '@/features/profile/useMyProfile'
import { ProfileSection } from '@/features/common/ProfileSection'
import AddressForm from '@/features/common/AddressForm'
import ContactForm from '@/features/common/ContactForm'
import LocationForm from '@/features/common/LocationForm'
import type { UserData } from '@/features/profile/profile.interface'
import type { Address, Contact, Location } from '@/features/profile/profile.interface'
import type { BusinessCartGroup } from '../hooks/useCart'

interface FormState {
	address: Address
	contact: Contact
	location?: Location
}

interface CheckoutConfirmationModalProps {
	visible: boolean
	group: BusinessCartGroup | null
	user: UserData | null
	onClose: () => void
	onComplete: () => void
	refreshUser: () => Promise<void>
}

const buildInitialForm = (user: UserData | null): FormState => ({
	address: user?.address || {},
	contact: {
		phone: user?.contact?.phone || user?.phone,
		backupPhones: user?.contact?.backupPhones || user?.backupPhones || [],
		email: user?.contact?.email || user?.email,
		whatsapp: user?.contact?.whatsapp
	},
	location: user?.location
})

export default function CheckoutConfirmationModal({ visible, group, user, onClose, onComplete, refreshUser }: CheckoutConfirmationModalProps) {
	const { colors } = useTheme()
	const { translate } = useUser()
	const { profile: cachedProfile, updateCache: updateProfileCache } = useMyProfile({ skipInitialFetch: true })
	const profileSource = cachedProfile || user
	const [form, setForm] = useState<FormState>(() => buildInitialForm(profileSource))
	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [disableConfirmation, setDisableConfirmation] = useState(false)
	const initialFormRef = useRef<FormState>(form)

	useEffect(() => {
		if (visible) {
			const initial = buildInitialForm(profileSource)
			initialFormRef.current = initial
			setForm(initial)
			setError(null)
			setDisableConfirmation(false)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible])

	useEffect(() => {
		if (visible && cachedProfile) {
			const initial = buildInitialForm(cachedProfile)
			initialFormRef.current = initial
			setForm(initial)
		}
	}, [visible, cachedProfile])

	const updateAddress = useCallback((address: Address) => {
		setForm((prev) => ({ ...prev, address }))
	}, [])

	const updateContact = useCallback((contact: Contact) => {
		setForm((prev) => ({ ...prev, contact }))
	}, [])

	const updateLocation = useCallback((location: Location) => {
		setForm((prev) => ({ ...prev, location }))
	}, [])

	const handleSave = useCallback(
		async (disableConfirmation = false) => {
			if (!profileSource) return

			const isDirty = JSON.stringify(form) !== JSON.stringify(initialFormRef.current)
			if (!isDirty && !disableConfirmation) {
				onComplete()
				return
			}

			setIsSaving(true)
			setError(null)

			try {
				const payload: any = {
					address: form.address,
					contact: form.contact
				}

				if (form.location?.sharingEnabled !== false) {
					payload.location = form.location
				}

				if (disableConfirmation) {
					payload.settings = {
						...profileSource.settings,
						purchases: {
							...profileSource.settings?.purchases,
							confirmation: { isEnabled: false }
						}
					}
				}

				const result = await updateMyProfile(payload)
				await refreshUser()
				if (result?.data) {
					await updateProfileCache(result.data)
				}
				onComplete()
			} catch (err: any) {
				console.error('Failed to save checkout confirmation profile:', err)
				setError(translate('checkout_save_failed', 'Failed to save your information. Please try again.'))
			} finally {
				setIsSaving(false)
			}
		},
		[profileSource, form, onComplete, translate, refreshUser, updateProfileCache]
	)

	const total = useMemo(() => {
		return group?.items.reduce((sum, item) => sum + (item.price?.total?.tnd || 0) * (item.quantity || 1), 0) || 0
	}, [group])

	return (
		<CenteredModal
			visible={visible}
			onClose={onClose}
			title={translate('confirm_purchase', 'Confirm Purchase')}
			subtitle={group ? `${group.items.length} ${group.items.length === 1 ? translate('item', 'item') : translate('items', 'items')} · ${total.toFixed(2)} TND` : undefined}
			icon="receipt-outline"
			scrollable
			footer={
				<View style={styles.footer}>
					{error && (
						<View style={[styles.errorBanner, { backgroundColor: colors.error + '15', borderColor: colors.error + '40' }]}>
							<Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
						</View>
					)}
					<View style={styles.actionRow}>
						<EyeButton
							onPress={() => setDisableConfirmation((prev) => !prev)}
							visible={disableConfirmation}
							label={translate('disable_confirm', "Don't ask again")}
							accessibilityRole="checkbox"
							accessibilityState={{ checked: disableConfirmation }}
						/>
						<CancelButton onPress={onClose} disabled={isSaving} />
						<IconButton
							icon="checkmark"
							label={translate('confirm_purchase', 'Confirm Purchase')}
							onPress={() => handleSave(disableConfirmation)}
							disabled={isSaving}
							loading={isSaving}
							variant="primary"
							colors={colors}
						/>
					</View>
				</View>
			}
		>
			{isSaving && (
				<View style={styles.loader}>
					<ActivityIndicator size="small" color={colors.primary} />
				</View>
			)}

			<ProfileSection title={translate('delivery_address', 'Delivery Address')} iconName="location-outline" style={styles.section}>
				<AddressForm
					street={form.address.street || ''}
					setStreet={(value) => updateAddress({ ...form.address, street: value })}
					city={form.address.city || ''}
					setCity={(value) => updateAddress({ ...form.address, city: value })}
					region={form.address.region || ''}
					setRegion={(value) => updateAddress({ ...form.address, region: value })}
					postalCode={form.address.postalCode || ''}
					setPostalCode={(value) => updateAddress({ ...form.address, postalCode: value })}
					country={form.address.country || ''}
					setCountry={(value) => updateAddress({ ...form.address, country: value })}
				/>
			</ProfileSection>

			<ProfileSection title={translate('contact_info', 'Contact Information')} iconName="call-outline" style={styles.section}>
				<ContactForm phone={form.contact.phone} backupPhones={form.contact.backupPhones} email={form.contact.email} whatsapp={form.contact.whatsapp} onChange={updateContact} />
			</ProfileSection>

			<ProfileSection title={translate('location', 'Location')} iconName="navigate-outline" style={styles.section}>
				<LocationForm location={form.location} onChange={updateLocation} />
			</ProfileSection>
		</CenteredModal>
	)
}

const styles = StyleSheet.create({
	loader: {
		alignItems: 'center',
		marginBottom: 12
	},
	errorBanner: {
		padding: 12,
		borderRadius: 10,
		borderWidth: 1,
		marginBottom: 16
	},
	errorText: {
		fontSize: 14,
		fontWeight: '500',
		lineHeight: 20
	},
	section: {
		marginBottom: 16
	},
	footer: {
		paddingTop: 8,
		gap: 12
	},
	actionRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 16
	},
	checkboxRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 4,
		gap: 8
	}
})
