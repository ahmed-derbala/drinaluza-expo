import { LocalizedName, ProductSpecs } from '../businesses/businesses.interface'

interface Product {
	_id: string
	slug: string
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
		max: number
		updatedAt?: string
	}
	updatedAt: string
	defaultProduct?: {
		media: {
			thumbnail: {
				url: string
			}
		}
	}
	media?: {
		thumbnail: {
			url: string
		}
	}
	specs?: ProductSpecs
}

interface ProductItem {
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
	business: {
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
			state?: string
			country: string
		}
		location?: {
			geo?: { type: 'Point'; coordinates: number[] }
			accuracy?: number
			altitude?: number
			heading?: number
			speed?: number
			deviceTimestamp?: string
			sharingEnabled?: boolean
			createdAt?: string
			updatedAt?: string
		}
		createdAt: string
		updatedAt: string
	}
	customer: {
		_id: string
		slug: string
		name: string | LocalizedName
		address?: {
			street: string
			city: string
			state?: string
			country: string
		}
		location?: {
			geo?: { type: 'Point'; coordinates: number[] }
			accuracy?: number
			altitude?: number
			heading?: number
			speed?: number
			deviceTimestamp?: string
			sharingEnabled?: boolean
			createdAt?: string
			updatedAt?: string
		}
		contact?: {
			phone?: {
				fullNumber: string
				countryCode: string
				localNumber: string
				createdAt: string
				updatedAt: string
			}
			backupPhones?: Array<{
				fullNumber: string
				countryCode: string
				localNumber: string
				createdAt: string
				updatedAt: string
			}>
			whatsapp?: string
			email?: string
			createdAt: string
			updatedAt: string
		}
		media?: {
			thumbnail: {
				url: string
			}
		}
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
