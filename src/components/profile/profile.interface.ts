import { LocalizedName } from '../shops/shops.interface'

export interface Phone {
	fullNumber?: string
	countryCode?: string
	shortNumber?: string
}

export interface BasicInfos {
	birthDate: Date | string | null
	biography?: string
}

export interface SocialMediaPlatform {
	url?: string
	username?: string
}

export interface SocialMedia {
	facebook?: SocialMediaPlatform
	messenger?: SocialMediaPlatform
	instagram?: SocialMediaPlatform
	whatsapp?: SocialMediaPlatform
}

export interface Media {
	thumbnail?: {
		url: string
	}
}

export interface Address {
	street?: string
	city?: string
	state?: string
	postalCode?: string
	country?: string
}

export interface UserSettings {
	lang: {
		app?: string
		content?: string
	}
	currency: string
}

export interface UserState {
	code: string
	updatedAt: string
}

export interface UserData {
	_id: string
	slug: string
	name: LocalizedName
	email?: string
	role: string
	isActive?: boolean
	state?: UserState
	phone?: Phone
	backupPhones?: Phone[]
	basicInfos: BasicInfos
	address: Address
	settings: UserSettings
	socialMedia?: SocialMedia
	media?: Media
	createdAt: string
	updatedAt: string
}
