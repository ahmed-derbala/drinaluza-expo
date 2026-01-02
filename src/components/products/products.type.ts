import { LocalizedName } from '../shops/shops.interface'

export type ProductType = {
	_id: string
	owner: {
		_id: string
		slug: string
		createdAt: string
		updatedAt: string
	}
	shop: {
		_id: string
		name: LocalizedName
		createdAt: string
		updatedAt: string
	}
	name: LocalizedName
	photos?: Array<{
		url: string
		alt?: string
	}>
	price?: {
		value?: {
			tnd?: number
			eur?: number
			usd?: number
		}
		unit?: {
			name: string
			min: number
		}
	}
	unit: {
		name: string
		min: number
	}
	searchTerms: string[]
	isActive: boolean
	availability: {
		endDate: string | null
		startDate: string
	}
	createdAt: string
	updatedAt: string
}
