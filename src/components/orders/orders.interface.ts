import { LocalizedName } from '../shops/shops.interface'

export interface Product {
	_id: string
	name: LocalizedName
	price: {
		total: {
			tnd: number
			eur?: number
			usd?: number
		}
		updatedAt: string
	}
	unit?: {
		measure: string
		min: number
		updatedAt?: string
	}
	updatedAt: string
	defaultProduct?: {
		images: {
			thumbnail: {
				url: string
			}
		}
	}
	images?: {
		thumbnail: {
			url: string
		}
	}
	photos?: string[]
}

export interface ProductItem {
	product: Product
	lineTotal: {
		tnd: number
		eur?: number
		usd?: number
		updatedAt: string
	}
	quantity: number
}

export interface OrderItem {
	_id: string
	shop: {
		_id: string
		name: LocalizedName
		slug?: string
		owner?: {
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
		address?: {
			street: string
			city: string
			country: string
		}
		location?: {
			type: string
			coordinates: number[]
		}
		createdAt: string
		updatedAt: string
	}
	customer: {
		_id: string
		slug: string
		name: string | LocalizedName
		updatedAt: string
	}
	products: ProductItem[]
	status: string
	price?: {
		total: {
			tnd: number
			eur?: number
			usd?: number
			updatedAt: string
		}
		updatedAt: string
	}
	createdAt: string
	updatedAt: string
	__v?: number
}

export interface OrderResponse {
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
		docs: OrderItem[]
	}
	req?: {
		headers: {
			tid: string
		}
	}
}
