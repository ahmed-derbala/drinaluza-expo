import { LocalizedName } from '../businesses/businesses.interface'

export interface RatingBreakdown {
	1: number
	2: number
	3: number
	4: number
	5: number
}

export interface Rating {
	breakdown: RatingBreakdown
	average: number
	count: number
	total: number
}

export type ProductType = {
	_id: string
	business: {
		_id: string
		name: LocalizedName
		slug: string
		owner: {
			_id: string
			slug: string
			name: LocalizedName
			updatedAt: string
		}
		address: {
			street: string
			city: string
			country: string
		}
		location: {
			type: string
			coordinates: number[]
		}
		createdAt: string
		updatedAt: string
	}
	defaultProduct?: {
		_id: string
		slug: string
		name: LocalizedName
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
	}
	name: LocalizedName
	photos?: string[]
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
	}
	searchTerms: string[]
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
	createdAt: string
	updatedAt: string
}
