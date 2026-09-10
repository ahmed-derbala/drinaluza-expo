/**
 * BusinessHeaderCard — modern business identity header.
 *
 * Purpose: display business cover, logo, name, kind, rating, description,
 * quick contact actions and key details. Owners (viewer.canEdit) get a
 * BaseCard editable mode with inline editing of thumbnail, multilingual
 * name and description; full settings live on the dashboard edit screen.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import StateBadge from '@ui/badges/StateBadge'
import { SmartMediaView, pickSingleMediaFile, uploadThumbnail } from '@smart-media'
import { PhoneButton, WhatsAppButton, EmailButton, WebsiteButton, DirectionsButton } from '@buttons'
import { IconBaseButton } from '@buttons/IconBaseButton'
import { BaseCard } from '@cards/BaseCard'
import { SectionRow } from '@ui/sections/SectionRow'
import Spinner from '@ui/spinner/Spinner'
import { toast } from '@ui/toast/Toast'
import { useTheme, themeColors } from '@theme'
import { useUser } from '@contexts/UserContext'
import { formatAddress } from '@address'
import { updateBusiness } from './businesses.api'
import { log } from '@log'
import type { Business } from './businesses.interface'

export interface BusinessHeaderCardProps {
	business: Business
	canEdit?: boolean
	onSaved?: (next: Business) => void
}

export function BusinessHeaderCard({ business, canEdit = false, onSaved }: BusinessHeaderCardProps) {
	const { colors } = useTheme()
	const { localize, translate } = useUser()
	const router = useRouter()
	const [editing, setEditing] = useState(false)
	const [saving, setSaving] = useState(false)
	const [uploadingPhoto, setUploadingPhoto] = useState(false)
	const [focusedField, setFocusedField] = useState<string | null>(null)
	const [nameEn, setNameEn] = useState(business.name?.en || '')
	const [nameTnLatn, setNameTnLatn] = useState(business.name?.tn_latn || '')
	const [nameTnArab, setNameTnArab] = useState(business.name?.tn_arab || '')
	const [description, setDescription] = useState(business.description || '')
	const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(business.media?.thumbnail?.url || null)
	const fullAddress = useMemo(() => formatAddress(business.address, localize), [business.address, localize])
	const kindLabel = useMemo(() => {
		if (!business.kind) return null
		const fallback = business.kind.replace(/_/g, ' ')
		return translate(`kind_${business.kind}`, fallback)
	}, [business.kind, translate])
	const backupPhones = useMemo(() => business.contact?.backupPhones || [], [business.contact?.backupPhones])
	const headerRight = useMemo(() => {
		if (!kindLabel && !canEdit) return null
		return (
			<View style={styles.headerRight}>
				{kindLabel ? (
					<View style={[styles.kindPill, { backgroundColor: colors.primary + '15' }]}>
						<Ionicons name="storefront-outline" size={12} color={colors.primary} />
						<Text style={[styles.kindPillText, { color: colors.primary }]} numberOfLines={1}>
							{kindLabel}
						</Text>
					</View>
				) : null}
				{canEdit ? (
					<IconBaseButton icon="settings-outline" label={translate('business_settings', 'Business settings')} onPress={() => router.push(`/dashboard/${business.slug}/edit` as never)} />
				) : null}
			</View>
		)
	}, [kindLabel, canEdit, colors.primary, router, business.slug, translate])
	const syncDrafts = useCallback((next: Business) => {
		setNameEn(next.name?.en || '')
		setNameTnLatn(next.name?.tn_latn || '')
		setNameTnArab(next.name?.tn_arab || '')
		setDescription(next.description || '')
		setThumbnailUrl(next.media?.thumbnail?.url || null)
	}, [])
	useEffect(() => {
		syncDrafts(business)
	}, [business, syncDrafts])
	const handlePhaseChange = useCallback((isEditing: boolean) => {
		setEditing(isEditing)
	}, [])
	const handleCancel = useCallback(() => {
		syncDrafts(business)
		setFocusedField(null)
	}, [business, syncDrafts])
	const handleSave = useCallback(async () => {
		if (!canEdit) return
		const enName = nameEn.trim()
		if (!enName) {
			toast.show({ title: translate('error', 'Error'), content: translate('business_name_required', 'Business name (English) is required'), borderColor: colors.error })
			return
		}
		try {
			setSaving(true)
			const res = await updateBusiness(business.slug, {
				name: {
					en: enName,
					tn_latn: nameTnLatn.trim() || enName,
					tn_arab: nameTnArab.trim() || enName
				},
				description: description.trim() || undefined
			})
			syncDrafts(res.data)
			onSaved?.(res.data)
			toast.show({ title: translate('success', 'Success'), content: translate('business_header_updated', 'Business header updated successfully'), borderColor: colors.success })
		} catch (err) {
			const message = err instanceof Error ? err.message : translate('failed_to_update', 'Failed to update business')
			toast.show({ title: translate('error', 'Error'), content: message, borderColor: colors.error })
		} finally {
			setSaving(false)
		}
	}, [canEdit, nameEn, nameTnLatn, nameTnArab, description, business.slug, colors.error, colors.success, onSaved, syncDrafts, translate])
	const handleThumbnailPress = useCallback(async () => {
		if (!editing || uploadingPhoto) return
		if (!business._id) {
			toast.show({ title: translate('error', 'Error'), content: translate('business_id_missing', 'Business id is missing. Please reload.'), borderColor: colors.error })
			return
		}
		try {
			const picked = await pickSingleMediaFile({ mediaType: 'image', multiple: false })
			if (!picked) return
			setUploadingPhoto(true)
			const file = await uploadThumbnail({ targetModelName: 'businesses', targetModelId: business._id, file: picked })
			setThumbnailUrl(file.url)
			toast.show({ title: translate('success', 'Success'), content: translate('business_photo_updated', 'Business photo updated successfully'), borderColor: colors.success })
		} catch (error) {
			log({ level: 'error', label: 'BusinessHeaderCard', message: 'Thumbnail upload failed', error })
			const message = error instanceof Error ? error.message : translate('failed_to_upload_photo', 'Failed to upload photo')
			toast.show({ title: translate('error', 'Error'), content: message, borderColor: colors.error })
		} finally {
			setUploadingPhoto(false)
		}
	}, [editing, uploadingPhoto, business._id, colors.error, colors.success, translate])
	const phoneValue = business.contact?.phone?.fullNumber || null

	return (
		<BaseCard
			mode={canEdit ? 'editable' : 'view'}
			headerRight={headerRight}
			onPhaseChange={handlePhaseChange}
			onSave={handleSave}
			onCancel={handleCancel}
			loading={saving}
			focused={editing}
			borderRadius={24}
			style={styles.card}
			contentStyle={styles.cardContent}
		>
			<View style={styles.cover}>
				<LinearGradient colors={[colors.primary, `${colors.primary}55`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
				<View style={[styles.decorCircle, styles.decorCircleLarge]} />
				<View style={[styles.decorCircle, styles.decorCircleSmall]} />
			</View>
			<View style={styles.body}>
				<View style={styles.identityRow}>
					<Pressable onPress={editing ? handleThumbnailPress : undefined} disabled={!editing || uploadingPhoto} style={styles.avatarPressable}>
						<SmartMediaView media={thumbnailUrl} style={styles.avatar} resizeMode="cover" enableFullscreenPreview={!editing} />
						{uploadingPhoto ? (
							<View style={styles.avatarOverlay}>
								<Spinner size="small" expand={false} style={styles.avatarSpinner} />
							</View>
						) : editing ? (
							<View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
								<Ionicons name="camera" size={14} color={themeColors.buttonText} />
							</View>
						) : null}
					</Pressable>
					<View style={styles.identityText}>
						<Text style={[styles.businessName, { color: colors.text }]} numberOfLines={2}>
							{localize(business.name)}
						</Text>
						<View style={styles.slugRow}>
							<View style={[styles.slugPill, { backgroundColor: `${colors.textTertiary}18` }]}>
								<Text style={[styles.slugText, { color: colors.textSecondary }]} numberOfLines={1}>
									@{business.slug}
								</Text>
							</View>
							{business.rating?.average ? (
								<View style={[styles.ratingPill, { backgroundColor: `${themeColors.warning}18` }]}>
									<Ionicons name="star" size={12} color={themeColors.warning} />
									<Text style={[styles.ratingText, { color: colors.text }]}>{business.rating.average.toFixed(1)}</Text>
									<Text style={[styles.ratingCount, { color: colors.textTertiary }]}>({business.rating.count})</Text>
								</View>
							) : null}
						</View>
						{business.state?.code ? (
							<View style={styles.stateRow}>
								<StateBadge stateCode={business.state.code} />
							</View>
						) : null}
					</View>
				</View>
				{editing ? (
					<View style={styles.form}>
						<View style={styles.inputGroup}>
							<Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{translate('name_en', 'Name (English)')} *</Text>
							<View style={[styles.inputWrapper, { borderColor: colors.border }, focusedField === 'nameEn' && { borderColor: colors.primary }]}>
								<Ionicons name="business-outline" size={18} color={focusedField === 'nameEn' ? colors.primary : colors.textTertiary} />
								<TextInput
									style={[styles.textInput, { color: colors.text }]}
									value={nameEn}
									onChangeText={setNameEn}
									placeholder={translate('business_name_placeholder', 'Business name')}
									placeholderTextColor={colors.textTertiary}
									onFocus={() => setFocusedField('nameEn')}
									onBlur={() => setFocusedField(null)}
								/>
							</View>
						</View>
						<View style={styles.inputGroup}>
							<Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{translate('name_tn_latn', 'Name (Tunisian Latin)')}</Text>
							<View style={[styles.inputWrapper, { borderColor: colors.border }, focusedField === 'nameTnLatn' && { borderColor: colors.primary }]}>
								<Ionicons name="language-outline" size={18} color={focusedField === 'nameTnLatn' ? colors.primary : colors.textTertiary} />
								<TextInput
									style={[styles.textInput, { color: colors.text }]}
									value={nameTnLatn}
									onChangeText={setNameTnLatn}
									placeholder={nameEn || translate('business_name_placeholder', 'Business name')}
									placeholderTextColor={colors.textTertiary}
									onFocus={() => setFocusedField('nameTnLatn')}
									onBlur={() => setFocusedField(null)}
								/>
							</View>
						</View>
						<View style={styles.inputGroup}>
							<Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{translate('name_tn_arab', 'Name (Tunisian Arabic)')}</Text>
							<View style={[styles.inputWrapper, { borderColor: colors.border }, focusedField === 'nameTnArab' && { borderColor: colors.primary }]}>
								<Ionicons name="language-outline" size={18} color={focusedField === 'nameTnArab' ? colors.primary : colors.textTertiary} />
								<TextInput
									style={[styles.textInput, styles.textInputRtl, { color: colors.text }]}
									value={nameTnArab}
									onChangeText={setNameTnArab}
									placeholder={nameEn || translate('business_name_placeholder', 'Business name')}
									placeholderTextColor={colors.textTertiary}
									onFocus={() => setFocusedField('nameTnArab')}
									onBlur={() => setFocusedField(null)}
								/>
							</View>
						</View>
						<View style={styles.inputGroup}>
							<Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{translate('description', 'Description')}</Text>
							<View style={[styles.inputWrapper, styles.textAreaWrapper, { borderColor: colors.border }, focusedField === 'description' && { borderColor: colors.primary }]}>
								<Ionicons name="document-text-outline" size={18} color={focusedField === 'description' ? colors.primary : colors.textTertiary} style={styles.textAreaIcon} />
								<TextInput
									style={[styles.textInput, styles.textArea, { color: colors.text }]}
									value={description}
									onChangeText={setDescription}
									placeholder={translate('business_description_placeholder', 'Describe your business, services or working hours...')}
									placeholderTextColor={colors.textTertiary}
									multiline={true}
									onFocus={() => setFocusedField('description')}
									onBlur={() => setFocusedField(null)}
								/>
							</View>
						</View>
					</View>
				) : business.description ? (
					<Text style={[styles.businessDescription, { color: colors.textSecondary }]}>{business.description}</Text>
				) : null}
				<View style={[styles.quickActions, { backgroundColor: colors.surface, borderColor: colors.border }]}>
					<PhoneButton phone={business.contact?.phone} backupPhones={backupPhones} size={44} />
					<WhatsAppButton whatsapp={business.contact?.whatsapp || business.contact?.phone?.fullNumber} size={44} />
					<EmailButton email={business.contact?.email} size={44} />
					<WebsiteButton website={business.contact?.website} size={44} />
					<DirectionsButton location={business.location} address={business.address} size={44} />
				</View>
				<View style={styles.meta}>
					{fullAddress ? <SectionRow label={translate('address', 'Address')} value={fullAddress} icon="location-outline" /> : null}
					{phoneValue ? <SectionRow label={translate('phone_number', 'Phone')} value={backupPhones.length > 0 ? `${phoneValue} · +${backupPhones.length}` : phoneValue} icon="call-outline" /> : null}
					{business.contact?.whatsapp ? <SectionRow label="WhatsApp" value={business.contact.whatsapp} icon="logo-whatsapp" /> : null}
					{business.contact?.email ? <SectionRow label="Email" value={business.contact.email} icon="mail-outline" /> : null}
					{typeof business.deliveryRadiusKm === 'number' ? <SectionRow label={translate('delivery_radius', 'Delivery')} value={`${business.deliveryRadiusKm} km`} icon="bicycle-outline" /> : null}
				</View>
			</View>
		</BaseCard>
	)
}

const styles = StyleSheet.create({
	card: {
		padding: 0,
		marginBottom: 16
	},
	cardContent: {
		padding: 0
	},
	headerRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8
	},
	kindPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 999,
		maxWidth: 160
	},
	kindPillText: {
		fontSize: 11,
		fontWeight: '700',
		textTransform: 'capitalize'
	},
	cover: {
		height: 128,
		width: '100%',
		overflow: 'hidden'
	},
	decorCircle: {
		position: 'absolute',
		backgroundColor: '#FFFFFF1A',
		borderRadius: 999
	},
	decorCircleLarge: {
		width: 220,
		height: 220,
		top: -110,
		right: -60
	},
	decorCircleSmall: {
		width: 120,
		height: 120,
		top: 40,
		left: -40,
		backgroundColor: '#FFFFFF12'
	},
	body: {
		paddingHorizontal: 20,
		paddingBottom: 20
	},
	identityRow: {
		flexDirection: 'row',
		gap: 16,
		marginTop: -46,
		marginBottom: 14,
		alignItems: 'flex-end'
	},
	avatarPressable: {
		position: 'relative'
	},
	avatar: {
		width: 92,
		height: 92,
		borderRadius: 28
	},
	avatarOverlay: {
		...StyleSheet.absoluteFill,
		borderRadius: 28,
		backgroundColor: '#00000055',
		justifyContent: 'center',
		alignItems: 'center'
	},
	avatarSpinner: {
		padding: 0
	},
	cameraBadge: {
		position: 'absolute',
		bottom: -4,
		right: -4,
		width: 28,
		height: 28,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 2
	},
	identityText: {
		flex: 1,
		gap: 6,
		paddingBottom: 2
	},
	businessName: {
		fontSize: 22,
		fontWeight: '800',
		letterSpacing: -0.5,
		lineHeight: 28
	},
	slugRow: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
		gap: 8
	},
	slugPill: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 999
	},
	slugText: {
		fontSize: 12,
		fontWeight: '600'
	},
	ratingPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 999
	},
	ratingText: {
		fontSize: 13,
		fontWeight: '800'
	},
	ratingCount: {
		fontSize: 11,
		fontWeight: '500'
	},
	stateRow: {
		alignSelf: 'flex-start'
	},
	businessDescription: {
		fontSize: 14,
		lineHeight: 21,
		marginBottom: 16
	},
	form: {
		gap: 12,
		marginBottom: 16
	},
	inputGroup: {
		gap: 6
	},
	inputLabel: {
		fontSize: 11,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginLeft: 4
	},
	inputWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		borderWidth: 1.5,
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 11,
		minHeight: 50
	},
	textInput: {
		flex: 1,
		fontSize: 15,
		fontWeight: '500',
		padding: 0
	},
	textInputRtl: {
		textAlign: 'right'
	},
	textAreaWrapper: {
		alignItems: 'flex-start',
		minHeight: 96,
		paddingVertical: 12
	},
	textAreaIcon: {
		marginTop: 2
	},
	textArea: {
		minHeight: 72,
		textAlignVertical: 'top'
	},
	quickActions: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 8,
		borderWidth: 1,
		borderRadius: 18,
		marginBottom: 8
	},
	meta: {
		paddingTop: 8
	}
})

export default BusinessHeaderCard
