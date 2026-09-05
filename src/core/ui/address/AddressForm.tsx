import { BaseForm, FormRow, FormCol, FormGroup, FormLabel, FormInputWrapper, FormInput } from '@forms/BaseForm'
import { useUser } from '@contexts/UserContext'
import type { MultiLang } from './address.interface'
import MultiLingualForm from '../languages/MultiLingualForm'

export interface AddressFormProps {
	street: MultiLang
	setStreet: (val: MultiLang) => void
	city: string
	setCity: (val: string) => void
	region: string
	setRegion: (val: string) => void
	country: string
	setCountry: (val: string) => void
}

export default function AddressForm({ street, setStreet, city, setCity, region, setRegion, country, setCountry }: AddressFormProps) {
	const { translate } = useUser()
	const streetObj = street || { en: '', tn_latn: '', tn_arab: '' }

	return (
		<BaseForm>
			<FormGroup>
				<FormLabel>{translate('street', 'Street Address')}</FormLabel>
				<MultiLingualForm
					nameEn={streetObj.en || ''}
					setNameEn={(val) => setStreet({ ...streetObj, en: val })}
					nameTnLatn={streetObj.tn_latn || ''}
					setNameTnLatn={(val) => setStreet({ ...streetObj, tn_latn: val })}
					nameTnArab={streetObj.tn_arab || ''}
					setNameTnArab={(val) => setStreet({ ...streetObj, tn_arab: val })}
					placeholderEn={translate('street_placeholder_en', 'e.g., 123 Main St')}
					placeholderTnLatn={translate('street_placeholder_tn_latn', 'e.g., Rue de la Paix')}
					placeholderTnArab={translate('street_placeholder_tn_arab', 'e.g., شارع السلام')}
					required={false}
				/>
			</FormGroup>

			<FormRow>
				<FormCol>
					<FormGroup>
						<FormLabel>{translate('city', 'City')}</FormLabel>
						<FormInputWrapper icon="business-outline">
							<FormInput value={city} onChangeText={setCity} placeholder={translate('city_placeholder', 'e.g., Ellouza')} />
						</FormInputWrapper>
					</FormGroup>
				</FormCol>
				<FormCol>
					<FormGroup>
						<FormLabel>{translate('region', 'Region')}</FormLabel>
						<FormInputWrapper icon="map-outline">
							<FormInput value={region} onChangeText={setRegion} placeholder={translate('region_placeholder', 'e.g., Sfax')} />
						</FormInputWrapper>
					</FormGroup>
				</FormCol>
			</FormRow>

			<FormGroup>
				<FormLabel>{translate('country', 'Country')}</FormLabel>
				<FormInputWrapper icon="earth-outline">
					<FormInput value={country} onChangeText={setCountry} placeholder={translate('country_placeholder', 'e.g., Tunisia')} />
				</FormInputWrapper>
			</FormGroup>
		</BaseForm>
	)
}
