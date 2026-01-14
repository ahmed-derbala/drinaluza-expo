import { getApiClient } from '../../core/api'

import { LocalizedName } from '../shops/shops.interface'

export interface MyBusiness {
	_id: string
	name: LocalizedName
	state: {
		code: string
		updatedAt: string
	}
	slug: string
	shopsCount: number
	productsCount: number
	salessCount: number
}

export interface MyBusinessResponse {
	level: string
	status: number
	data: MyBusiness
	req: {
		headers: {
			tid: string
		}
	}
}

export const getMyBusiness = async (): Promise<MyBusinessResponse> => {
	const response = await getApiClient().get('/businesses/my-business')
	return response.data
}

export const requestBusiness = async () => {
	const response = await getApiClient().post('/businesses/requests')
	return response.data
}

// Sales API interfaces
export interface SalesProduct {
	product: {
		_id: string
		media?: {
			thumbnail?: {
				url: string
			}
		}
		defaultProduct: {
			slug: string
			name: {
				en: string
				tn_latn?: string
				tn_arab?: string
			}
			media?: {
				thumbnail?: {
					url: string
				}
			}
		}
		name: {
			en: string
			tn_latn?: string
			tn_arab?: string
		}
		price: {
			total: {
				tnd: number
				eur?: number | null
				usd?: number | null
			}
		}
		unit: {
			measure: string
			min: number
			max: number
		}
	}
	lineTotal: {
		tnd: number
		eur?: number | null
		usd?: number | null
	}
	quantity: number
}

export interface SalesCustomer {
	_id: string
	role: string
	slug: string
	name: {
		en: string
	}
	address: {
		street: string
		city: string
		state: string
		country: string
	}
	contact: {
		phone: {
			fullNumber: string
		}
		email?: string
	}
	media?: {
		thumbnail?: {
			url: string
		}
	}
}

export interface SalesShop {
	_id: string
	name: {
		en: string
	}
	slug: string
	address: {
		street: string
		city: string
		state: string
		country: string
	}
}

export interface Sale {
	_id: string
	shop: SalesShop
	customer: SalesCustomer
	products: SalesProduct[]
	status: string
	price: {
		total: {
			tnd: number
			eur: number
			usd: number
		}
	}
	createdAt: string
	updatedAt: string
}

export interface SalesResponse {
	level: string
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
		docs: Sale[]
	}
	req: {
		headers: {
			tid: string
		}
	}
}

export const getSales = async (): Promise<SalesResponse> => {
	const response = await getApiClient().get('/sales')
	return response.data
}
