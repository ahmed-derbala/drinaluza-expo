export type LocalizedName = {
	en: string
	tn_latn?: string
	tn_arab?: string
}

type GeoPoint = {
	type: 'Point'
	coordinates: [number, number]
	sharingEnabled?: boolean
	_id?: string
	createdAt?: string
	updatedAt?: string
}

type Owner = {
	_id: string
	slug: string
	name: LocalizedName
	updatedAt?: string
}

type Contact = {
	phone: {
		fullNumber: string
		countryCode: string
		localNumber: string
		_id: string
	}
	backupPhones?: Array<{
		fullNumber: string
		countryCode: string
		localNumber: string
		_id: string
	}>
	whatsapp?: string
	email?: string
}

type RatingBreakdown = {
	1: number
	2: number
	3: number
	4: number
	5: number
}

type Rating = {
	breakdown: RatingBreakdown
	average: number
	count: number
	total: number
}

type BusinessState = {
	code: string
}

export type Business = {
	_id: string
	name: LocalizedName
	slug: string
	owner: Owner
	address?: {
		street: string
		city: string
		region: string
		country: string
	}
	location?: GeoPoint
	state?: BusinessState
	media?: {
		thumbnail?: {
			url: string
		}
		_id?: string
	}
	contact?: Contact
	rating?: Rating
	deliveryRadiusKm?: number
	isActive?: boolean
	createdAt?: string
	updatedAt?: string
	operatingHours?: Record<string, unknown>
	description?: string
	categories?: string[]
}

type Pagination = {
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

type BusinessesData = {
	pagination: Pagination
	docs: Business[]
}

export type BusinessProductsResponse = {
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
	business: Business
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
	searchKeywords?: string[]
	state?: {
		code: string
		_id?: string
		createdAt?: string
		updatedAt?: string
	}
	isActive?: boolean
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

export type BusinessResponse = {
	status: number
	data: Business
	req: {
		headers: {
			tid: string
		}
	}
}

export interface BusinessesResponse {
	status: number
	data: {
		docs: Business[]
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

export type CreateBusinessRequest = {
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
	media?: {
		thumbnail?: {
			url: string
		}
	}
}

export type CreateBusinessResponse = {
	status: number
	data: Business
	req: {
		headers: {
			tid: string
		}
	}
}
