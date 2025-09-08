import apiClient from '../../core/api'
import { ProductType } from './products.type'

export interface CreateProductRequest {
	name: string
	shopId: string
	defaultProductId?: string
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
	}
	photos?: any[]
	searchTerms?: string[]
	stock?: {
		quantity: number
		minThreshold: number
	}
	availability?: {
		startDate: string
		endDate?: string
	}
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
		data: ProductType[]
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
		tn: string
		tn_ar: string
	}
	searchKeywords: string[]
	isActive: boolean
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
		data: DefaultProduct[]
	}
	req: {
		headers: {
			tid: string
		}
	}
}

export const getShopProducts = async (shopId: string, page: number = 1, limit: number = 10): Promise<ProductsResponse> => {
	const response = await apiClient.get(`/shops/my-shops/${shopId}/products?page=${page}&limit=${limit}`)
	return response.data
}

export const createProduct = async (productData: CreateProductRequest): Promise<{ status: number; data: ProductType }> => {
	const { shopId, ...productPayload } = productData
	const response = await apiClient.post(`/shops/my-shops/${shopId}/products/create`, productPayload)
	return response.data
}

export const getDefaultProducts = async (page: number = 1, limit: number = 50): Promise<DefaultProductsResponse> => {
	const response = await apiClient.get(`/default-products?page=${page}&limit=${limit}`)
	return response.data
}

export const getDefaultProduct = async (id: string): Promise<{ status: number; data: DefaultProduct }> => {
	const response = await apiClient.get(`/default-products/${id}`)
	return response.data
}

export const getMyProducts = async (page: number = 1, limit: number = 10): Promise<ProductsResponse> => {
	const response = await apiClient.get(`/products/my-products?page=${page}&limit=${limit}`)
	return response.data
}
