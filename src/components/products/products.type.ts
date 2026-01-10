import { LocalizedName } from '../shops/shops.interface'

export type ProductType = {
	_id: string
	shop: {
		_id: string
		name: LocalizedName
		slug: string
		owner: {
			_id: string
			slug: string
			name: LocalizedName
			updatedAt: string
			business?: {
				_id: string
				slug: string
				name: LocalizedName
				state: {
					code: string
					updatedAt: string
				}
			}
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
		updatedAt: string
	}
	searchTerms: string[]
	isActive: boolean
	availability: {
		endDate: string | null
		startDate: string
	}
	stock: {
		quantity: number
		minThreshold: number
	}
	slug: string
	createdAt: string
	updatedAt: string
}
