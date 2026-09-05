import { View, Text } from 'react-native'
import { useTheme } from '@theme'
import { useUser } from '@contexts/UserContext'
import { BaseCard } from '@cards/BaseCard'
import { SectionRow } from '@ui/sections/SectionRow'
import AddressForm from './AddressForm'
import type { MultiLang } from './address.interface'

export interface AddressCardProps {
	address?: {
		street?: MultiLang
		city?: string
		region?: string
		country?: string
	}
	isEditing: boolean
	onEdit: () => void
	onSave: () => void
	onCancel: () => void
	onChange: (field: 'street' | 'city' | 'region' | 'country', value: any) => void
	title?: string
}

export default function AddressCard({ address, isEditing, onEdit, onSave, onCancel, onChange, title }: AddressCardProps) {
	const { colors } = useTheme()
	const { translate } = useUser()

	const street = address?.street || { en: '', tn_latn: '', tn_arab: '' }
	const city = address?.city || ''
	const region = address?.region || ''
	const country = address?.country || ''

	return (
		<BaseCard
			title={title ?? translate('address', 'Address')}
			iconName="location-outline"
			mode={isEditing ? 'edit' : onEdit !== undefined ? 'editable' : 'view'}
			onEdit={onEdit}
			onSave={onSave}
			onCancel={onCancel}
		>
			{isEditing ? (
				<AddressForm
					street={street}
					setStreet={(val) => onChange('street', val)}
					city={city}
					setCity={(val) => onChange('city', val)}
					region={region}
					setRegion={(val) => onChange('region', val)}
					country={country}
					setCountry={(val) => onChange('country', val)}
				/>
			) : (
				<View style={{ gap: 12 }}>
					{(street?.en || street?.tn_latn || street?.tn_arab) && <SectionRow label={translate('street', 'Street')} value={localize(street) || '—'} icon="home" iconColor={colors.primary} />}
					{(city || region) && (
						<SectionRow label={`${translate('city', 'City')}/${translate('region', 'Region')}`} value={[city, region].filter(Boolean).join(', ') || '—'} icon="business" iconColor={colors.primary} />
					)}
					{country && <SectionRow label={translate('country', 'Country')} value={country} icon="earth" iconColor={colors.primary} />}
					{!street?.en && !street?.tn_latn && !street?.tn_arab && !city && !region && !country && (
						<Text style={{ fontStyle: 'italic', color: colors.textTertiary, padding: 8 }}>{translate('no_address_info', 'No address information set.')}</Text>
					)}
				</View>
			)}
		</BaseCard>
	)
}

function localize(street: MultiLang): string {
	return street?.en || street?.tn_latn || street?.tn_arab || ''
}
