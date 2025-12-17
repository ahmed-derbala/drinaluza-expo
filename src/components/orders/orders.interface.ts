export interface Product {
	_id: string
	name: string
	price: {
		value: {
			tnd: number
			eur?: number
			usd?: number
		}
		unit: {
			name: string
			min: number
		}
		createdAt: string
		updatedAt: string
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
	finalPrice: {
		quantity: number
		createdAt: string
		updatedAt: string
	}
}

export interface OrderItem {
	_id: string
	shop: {
		_id: string
		name: string
		slug?: string
		owner?: {
			_id: string
			slug: string
			name: string
			updatedAt: string
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
		name: string
		updatedAt: string
	}
	products: ProductItem[]
	status: string
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
