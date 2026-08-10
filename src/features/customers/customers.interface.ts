import { LocalizedName } from '@/features/businesses/businesses.interface'

export interface Customer {
	_id: string
	role: string
	slug: string
	name: LocalizedName
	address?: {
		street?: string
		city?: string
		state?: string
		region?: string
		country?: string
		postalCode?: string
	}
	location?: {
		geo?: { type: 'Point'; coordinates: [number, number] }
		accuracy?: number
		altitude?: number
		heading?: number
		speed?: number
		deviceTimestamp?: string
		sharingEnabled: boolean
		updatedAt?: string
	}
	contact?: {
		phone?: {
			fullNumber: string
			countryCode: string
			localNumber: string
			createdAt?: string
			updatedAt?: string
		}
		backupPhones?: Array<{
			fullNumber: string
			countryCode: string
			localNumber: string
			createdAt?: string
			updatedAt?: string
		}>
		whatsapp?: string
		email?: string
		website?: string
		createdAt?: string
		updatedAt?: string
	}
	media?: {
		thumbnail?: {
			url: string
		}
	}
	updatedAt?: string
}
