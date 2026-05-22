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

export interface BusinessOwner {
	_id: string
	slug: string
	name: LocalizedName
	updatedAt: string
}

export interface BusinessAddress {
	street: string
	city: string
	region?: string
	state?: string
	postalCode?: string
	country: string
}

export interface BusinessLocation {
	type: string
	coordinates: number[]
	sharingEnabled?: boolean
	updatedAt?: string
}

export interface FeedBusiness {
	_id: string
	name: LocalizedName
	slug: string
	owner: BusinessOwner
	address: BusinessAddress
	location: BusinessLocation
	media?: {
		thumbnail?: {
			url: string
		}
	}
	rating?: Rating
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
	step?: number
	updatedAt?: string
}
export interface Stock {
	quantity: number
	minThreshold: number
}

export interface CardInfo {
	kind: string
	purchase?: {
		allowed: boolean
	}
}

export interface FeedItem {
	_id: string
	feedId?: string
	business?: FeedBusiness
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
	role?: string
	address?: BusinessAddress
	location?: BusinessLocation
	businesses?: string[]
	rating?: Rating
}

export interface ProductFeedItem extends FeedItem {
	business: FeedBusiness
	name: LocalizedName
	price: Price
	unit: Unit
	state: {
		code: string
		updatedAt: string
	}
	stock: Stock
	rating?: Rating
}

export interface BusinessFeedItem extends FeedItem {
	business: FeedBusiness
	name: LocalizedName
	media: {
		thumbnail?: {
			url: string
		}
	}
	rating?: Rating
}

export interface UserFeedItem extends FeedItem {
	name: LocalizedName
	role: string
	address: BusinessAddress
	state: {
		code: string
		updatedAt: string
	}
}

export interface RawFeedDoc {
	_id: string
	targetData: any
	targetResource: 'products' | 'businesses' | 'users'
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
