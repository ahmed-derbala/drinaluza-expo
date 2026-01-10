import { LocalizedName } from '../shops/shops.interface'

export interface ShopOwner {
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

export interface ShopAddress {
	street: string
	city: string
	state: string
	postalCode: string
	country: string
}

export interface ShopLocation {
	type: string
	coordinates: number[]
}

export interface Shop {
	_id: string
	name: LocalizedName
	slug: string
	owner: ShopOwner
	address: {
		street: string
		city: string
		country: string
	}
	location: ShopLocation
	createdAt: string
	updatedAt: string
}

export interface Price {
	total: {
		tnd: number
		eur?: number | null
		usd?: number | null
		updatedAt: string
	}
	updatedAt: string
}

export interface Unit {
	measure: string
	min: number
	max: number
	updatedAt?: string
}
export interface Stock {
	quantity: number
	minThreshold: number
}

export interface CardInfo {
	type: string
}

export interface FeedItem {
	_id: string
	shop: Shop
	name: LocalizedName
	price: Price
	unit: Unit
	searchTerms: string[]
	isActive: boolean
	availability: {
		endDate: string | null
		startDate: string
	}
	stock: Stock
	photos: string[]
	slug: string
	createdAt: string
	updatedAt: string
	__v: number
	card?: CardInfo
	defaultProduct?: {
		_id: string
		slug: string
		name: LocalizedName
		updatedAt: string
		images?: {
			thumbnail: {
				url: string
			}
		}
	}
}

export interface FeedResponse {
	status: number
	data: {
		pagination: {
			totalDocs: number
			totalPages: number
			page: number
			limit: number
			hasNextPage: boolean
			nextPage: number | null
			hasPrevPage: boolean
			prevPage: number | null
			returnedDocsCount: number
		}
		docs: FeedItem[]
	}
}
