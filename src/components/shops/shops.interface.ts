export type GeoPoint = {
	type: 'Point'
	coordinates: [number, number]
}

export type Owner = {
	_id: string
	slug: string
	name: string
	updatedAt?: string
}

export type Shop = {
	_id: string
	name: string
	owner: Owner
	location?: GeoPoint
	address?: unknown
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
	data: Shop[]
}

export type ShopProductsResponse = {
	status: number
	data: {
		pagination: Pagination
		data: Product[]
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
	name: string
	price: {
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
	photos: string[]
	slug: string
	createdAt: string
	updatedAt: string
	__v: number
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

export type ShopsResponse = {
	status: number
	data: Shop[]
	req: {
		headers: {
			tid: string
		}
	}
}

export type CreateShopRequest = {
	name: string
	location?: {
		type: 'Point'
		coordinates?: [number, number]
	}
	deliveryRadiusKm?: number
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
