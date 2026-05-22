import { getApiClient } from '../../core/api'
import { LocalizedName } from '../businesses/businesses.interface'
import { ProductType } from './products.type'

export interface CreateProductRequest {
	business: {
		slug: string
		_id: string
	}
	defaultProduct: {
		slug: string
		_id: string
	}
	name: LocalizedName
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
		step: number
	}
	searchTerms?: string[]
	stock?: {
		quantity: number
		minThreshold: number
	}
	availability?: {
		startDate: string
		endDate?: string | null
	}
	media?: {
		thumbnail?: {
			url: string
		}
	}
	photos?: string[]
}

export interface ProductsResponse {
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
		docs: ProductType[]
	}
	req: {
		headers: {
			tid: string
		}
	}
}

export interface DefaultProduct {
	_id: string
	name: {
		en: string
		tn_latn?: string
		tn_arab?: string
	}
	searchKeywords: string[]
	media: {
		thumbnail: {
			url: string
		}
	}
	isActive: boolean
	slug: string
	createdAt: string
	updatedAt: string
}

export interface DefaultProductsResponse {
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
		docs: DefaultProduct[]
	}
	req: {
		headers: {
			tid: string
		}
	}
}

export const getBusinessProducts = async (businessId: string, page: number = 1, limit: number = 10): Promise<ProductsResponse> => {
	const response = await getApiClient().get(`/businesses/my-businesses/${businessId}/products?page=${page}&limit=${limit}`)
	return response.data
}

export const createProduct = async (productData: CreateProductRequest): Promise<{ status: number; data: ProductType }> => {
	const response = await getApiClient().post('/products', productData)
	return response.data
}

export const getDefaultProducts = async (page: number = 1, limit: number = 50): Promise<DefaultProductsResponse> => {
	const response = await getApiClient().get(`/default-products?page=${page}&limit=${limit}`)
	return response.data
}

export const getDefaultProduct = async (id: string): Promise<{ status: number; data: DefaultProduct }> => {
	const response = await getApiClient().get(`/default-products/${id}`)
	return response.data
}

export const getMyProducts = async (page: number = 1, limit: number = 10): Promise<ProductsResponse> => {
	const response = await getApiClient().get(`/products/my-products?page=${page}&limit=${limit}`)
	return response.data
}

export const getProductBySlug = async (productSlug: string): Promise<{ status: number; data: ProductType }> => {
	const response = await getApiClient().get(`/products/${productSlug}`)
	return response.data
}
