import type { MultiLang, Address } from '@/features/common/address'
import type { ProductSpecs } from '@/features/businesses/businesses.interface'

interface RatingBreakdown {
	1: number
	2: number
	3: number
	4: number
	5: number
}

interface Rating {
	breakdown: RatingBreakdown
	average: number
	count: number
	total: number
}

export interface FileRef {
	_id: string
	name?: string
	extension?: string
	url: string
	encoding?: string
	mimetype?: string
	size?: number
	updatedAt?: string
	createdAt?: string
}

export type ProductType = {
	_id: string
	business: {
		_id: string
		name: MultiLang
		slug: string
		owner: {
			_id: string
			slug: string
			name: MultiLang
			updatedAt: string
		}
		address: Address
		location: {
			type: string
			coordinates: number[]
		}
		media?: {
			thumbnail?: {
				url: string
			}
		}
		contact?: {
			phone?: {
				fullNumber: string
			}
			backupPhones?: Array<{
				fullNumber: string
			}>
			whatsapp?: string
			email?: string
			website?: string
		}
		createdAt: string
		updatedAt: string
	}
	defaultProduct?: {
		_id: string
		slug: string
		name: MultiLang
		updatedAt: string
		media?: {
			thumbnail: {
				url: string
			}
		}
	}
	media?: {
		thumbnail?: {
			url: string
		}
		gallery?: FileRef[]
	}
	name: MultiLang
	price: {
		total: {
			tnd: number
			eur?: number | null
			usd?: number | null
			updatedAt: string
		}
		updatedAt: string
	}
	unit: {
		measure: string
		min: number
		max: number
		step?: number
		updatedAt: string
		singlePiece?: {
			minWeightKg?: number
			avgWeightKg?: number
			maxWeightKg?: number
		}
	}
	availability: {
		endDate: string | null
		startDate: string
	}
	stock: {
		quantity: number
		minThreshold: number
	}
	state: {
		code: string
		updatedAt?: string
	}
	rating?: Rating
	slug: string
	qrcode?: string | { url: string }
	specs?: ProductSpecs
	createdAt: string
	updatedAt: string
}
