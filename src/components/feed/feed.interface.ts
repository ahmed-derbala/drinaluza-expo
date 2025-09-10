export interface ShopOwner {
	_id: string
	slug: string
	name: string
	updatedAt: string
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
	name: string
	slug: string
	owner: ShopOwner
	address: ShopAddress
	location: ShopLocation
	createdAt: string
	updatedAt: string
}

export interface Price {
	value: {
		tnd: number
	}
	unit: {
		name: string
		min: number
	}
	createdAt: string
	updatedAt: string
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
	name: string
	price: Price
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
		data: FeedItem[]
	}
}
