export type LocalizedName = {
	en: string
	tn_latn?: string
	tn_arab?: string
}

export type GeoPoint = {
	type: 'Point'
	coordinates: [number, number]
}

export type Owner = {
	_id: string
	slug: string
	name: LocalizedName
	updatedAt?: string
}

export type Shop = {
	_id: string
	name: LocalizedName
	slug: string
	owner: Owner
	location?: GeoPoint
	address?: {
		street: string
		city: string
		state: string
		postalCode: string
		country: string
	}
	operatingHours?: Record<string, unknown>
	deliveryRadiusKm?: number
	isActive: boolean
	createdAt?: string
	updatedAt?: string
}

export type Pagination = {
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

export type ShopsData = {
	pagination: Pagination
	docs: Shop[]
}

export type ShopProductsResponse = {
	status: number
	data: {
		pagination: Pagination
		docs: Product[]
	}
	req: {
		headers: {
			tid: string
		}
	}
}

export interface Product {
	_id: string
	shop: Shop
	name: LocalizedName
	price: {
		total: {
			tnd: number
			eur?: number | null
			usd?: number | null
			updatedAt?: string
		}
		updatedAt?: string
	}
	unit?: {
		measure: string
		min: number
		max: number
		updatedAt?: string
	}
	searchTerms?: string[]
	isActive: boolean
	availability: {
		endDate: string | null
		startDate: string
	}
	stock: {
		quantity: number
		minThreshold: number
	}
	photos?: string[]
	media?: {
		thumbnail?: {
			url: string
		}
	}
	defaultProduct?: {
		_id: string
		slug: string
		name: LocalizedName
		updatedAt: string
		media?: {
			thumbnail?: {
				url: string
			}
		}
	}
	slug: string
	createdAt: string
	updatedAt: string
	__v?: number
}

export type ShopResponse = {
	status: number
	data: Shop
	req: {
		headers: {
			tid: string
		}
	}
}

export interface ShopsResponse {
	status: number
	data: {
		docs: Shop[]
		pagination: Pagination
	}
	req: {
		headers: {
			tid: string
		}
	}
	headers: {
		tid: string
	}
	tid: string
}

export type CreateShopRequest = {
	name: LocalizedName
	address?: {
		street: string
		city: string
		state: string
		postalCode: string
		country: string
	}
	location?: {
		coordinates?: [number, number]
	}
	deliveryRadiusKm: number
}

export type CreateShopResponse = {
	status: number
	data: Shop
	req: {
		headers: {
			tid: string
		}
	}
}
