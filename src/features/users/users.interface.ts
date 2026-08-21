import type { LocalizedName, Address } from '@/features/common/address'

interface UserLocation {
	geo?: {
		type: 'Point'
		coordinates: [number, number]
	}
	accuracy?: number
	altitude?: number
	heading?: number
	speed?: number
	deviceTimestamp?: string
	sharingEnabled: boolean
	createdAt?: string
	updatedAt?: string
}

interface UserContact {
	phone?: {
		fullNumber: string
		countryCode: string
		localNumber: string
	}
	backupPhones?: Array<{
		fullNumber: string
		countryCode: string
		localNumber: string
	}>
	whatsapp?: string
	email?: string
}

interface UserState {
	code: 'active' | 'inactive' | 'suspended'
	createdAt?: string
	updatedAt?: string
}

export interface UserProfile {
	_id: string
	slug: string
	name: LocalizedName
	role: string
	contact?: UserContact
	address?: Address
	media?: {
		thumbnail?: {
			url: string
		}
	}
	state?: UserState
	location?: UserLocation
	__v?: number
}

export interface UserResponse {
	level: string
	status: number
	message: string
	data: UserProfile
}
