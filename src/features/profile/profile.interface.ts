import type { MultiLang, Address } from '@/features/common/address'
export type { Address } from '@/features/common/address'
export interface Phone {
	fullNumber?: string
	countryCode?: string
	shortNumber?: string
	localNumber?: string
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
export interface Location {
	geo?: {
		type: 'Point'
		coordinates: [number, number] // [longitude, latitude]
	}
	accuracy?: number
	altitude?: number
	heading?: number
	speed?: number
	deviceTimestamp?: string
	sharingEnabled?: boolean
	createdAt?: string
	updatedAt?: string
}
interface UserSettings {
	language: {
		app?: string
		content?: string
	}
	currency: string
	purchases?: {
		confirmation?: {
			isEnabled?: boolean
		}
	}
}
interface UserState {
	code: string
	updatedAt: string
}
export interface Contact {
	phone?: Phone
	backupPhones?: Phone[]
	whatsapp?: string
	email?: string
	website?: string
}
export interface UserData {
	_id: string
	slug: string
	name: MultiLang
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
