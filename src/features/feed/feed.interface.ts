import { LocalizedName, ProductSpecs } from '../businesses/businesses.interface'

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

interface BusinessOwner {
	_id: string
	slug: string
	name: LocalizedName
	updatedAt: string
}

interface BusinessAddress {
	street: string
	city: string
	region?: string
	state?: string
	postalCode?: string
	country: string
}

interface BusinessLocation {
	geo?: {
		type: 'Point'
		coordinates: number[]
	}
	accuracy?: number
	altitude?: number
	heading?: number
	speed?: number
	deviceTimestamp?: string
	sharingEnabled?: boolean
	updatedAt?: string
}

interface FeedBusiness {
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
	createdAt: string
	updatedAt: string
}

interface Price {
	total: {
		tnd: number
		eur?: number | null
		usd?: number | null
		updatedAt: string
	}
	updatedAt: string
}

interface Unit {
	measure: string
	min: number
	max: number
	step?: number
	updatedAt?: string
}
interface Stock {
	quantity: number
	minThreshold: number
}

interface CardInfo {
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
	specs?: ProductSpecs
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
	isActive?: boolean
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
