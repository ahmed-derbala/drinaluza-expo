import type { MultiLang, Address } from '@/features/common/address'

export interface Customer {
	_id: string
	role: string
	slug: string
	name: MultiLang
	address?: Address
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
