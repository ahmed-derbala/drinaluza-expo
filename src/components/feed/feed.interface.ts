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
	region?: string
	state?: string
	postalCode?: string
	country: string
}

export interface ShopLocation {
	type: string
	coordinates: number[]
	sharingEnabled?: boolean
	updatedAt?: string
}

export interface Shop {
	_id: string
	name: LocalizedName
	slug: string
	owner: ShopOwner
	address: ShopAddress
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
	kind: string
}

export interface FeedItem {
	_id: string
	shop?: Shop
	name?: LocalizedName
	price?: Price
	unit?: Unit
	searchTerms?: string[]
	state?: {
		code: string
		updatedAt: string
	}
	availability?: {
		endDate: string | null
		startDate: string
	}
	stock?: Stock
	photos?: string[]
	media?: {
		thumbnail?: {
			url: string
		}
	}
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
		media?: {
			thumbnail: {
				url: string
			}
		}
	}
	contact?: {
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
	// User-specific fields
	role?: string
	address?: ShopAddress
	location?: ShopLocation
	shops?: string[]
}

export interface ProductFeedItem extends FeedItem {
	shop: Shop
	name: LocalizedName
	price: Price
	unit: Unit
	state: {
		code: string
		updatedAt: string
	}
	stock: Stock
}

export interface ShopFeedItem extends FeedItem {
	shop: Shop
	name: LocalizedName
	media: {
		thumbnail?: {
			url: string
		}
	}
}

export interface UserFeedItem extends FeedItem {
	name: LocalizedName
	role: string
	address: ShopAddress
	state: {
		code: string
		updatedAt: string
	}
}

// Raw API response types (before normalization)

export interface RawFeedDoc {
	_id: string
	targetData: any
	targetResource: 'product' | 'shop' | 'user'
	card: {
		kind: string
	}
	createdAt: string
	updatedAt: string
	__v: number
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
		docs: RawFeedDoc[]
	}
}

export interface NormalizedFeedResponse {
	status: number
	data: {
		pagination: FeedResponse['data']['pagination']
		docs: FeedItem[]
	}
}
