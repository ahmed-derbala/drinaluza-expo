import { LocalizedName } from '../businesses/businesses.interface'

interface Phone {
	fullNumber?: string
	countryCode?: string
	shortNumber?: string
}

interface BasicInfos {
	birthDate: Date | string | null
	biography?: string
}

interface SocialMediaPlatform {
	url?: string
	username?: string
}

interface SocialMedia {
	facebook?: SocialMediaPlatform
	messenger?: SocialMediaPlatform
	instagram?: SocialMediaPlatform
	whatsapp?: SocialMediaPlatform
}

interface Media {
	thumbnail?: {
		url: string
	}
}

interface Address {
	street?: string
	city?: string
	state?: string
	postalCode?: string
	country?: string
}

interface Location {
	type: string
	coordinates: [number, number] // [longitude, latitude]
	sharingEnabled?: boolean
	createdAt?: string
	updatedAt?: string
}

interface UserSettings {
	lang: {
		app?: string
		content?: string
	}
	currency: string
}

interface UserState {
	code: string
	updatedAt: string
}

interface Contact {
	phone?: Phone
	backupPhones?: Phone[]
	whatsapp?: string
	email?: string
}

export interface UserData {
	_id: string
	slug: string
	name: LocalizedName
	email?: string // Deprecated - use contact.email
	role: string
	isActive?: boolean
	state?: UserState
	phone?: Phone // Deprecated - use contact.phone
	backupPhones?: Phone[] // Deprecated - use contact.backupPhones
	contact?: Contact
	basicInfos: BasicInfos
	address: Address
	location?: Location
	settings: UserSettings
	socialMedia?: SocialMedia
	media?: Media
	createdAt: string
	updatedAt: string
}

// Export alias for backward compatibility
type User = UserData
