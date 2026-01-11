import { getApiClient } from '../../core/api'
import { ShopsResponse, CreateShopRequest, CreateShopResponse, ShopResponse, ShopProductsResponse } from './shops.interface'
import { log } from '../../core/log'

export const getMyShops = async (): Promise<ShopsResponse> => {
	try {
		const response = await getApiClient().get(`/shops/my-shops`)
		return response.data
	} catch (error: any) {
		log({
			level: 'error',
			label: 'shops.api',
			message: 'Error fetching my shops',
			error
		})
		throw error
	}
}

export const getShops = async (page: number = 1, limit: number = 100): Promise<ShopsResponse> => {
	try {
		const response = await getApiClient().get(`/shops?page=${page}&limit=${limit}`)
		return response.data
	} catch (error: any) {
		log({
			level: 'error',
			label: 'shops.api',
			message: 'Error fetching shops',
			error
		})
		throw error
	}
}

export const createShop = async (shopData: CreateShopRequest): Promise<CreateShopResponse> => {
	try {
		log({
			level: 'info',
			label: 'shops.api',
			message: 'Creating shop',
			data: { name: shopData.name }
		})
		const response = await getApiClient().post(`/shops`, shopData)
		return response.data
	} catch (error: any) {
		log({
			level: 'error',
			label: 'shops.api',
			message: 'Error creating shop',
			error,
			data: shopData
		})
		throw error
	}
}

export const getShopDetails = async (shopId: string): Promise<ShopResponse> => {
	try {
		const response = await getApiClient().get(`/shops/my-shops/${shopId}`)
		return response.data
	} catch (error: any) {
		log({
			level: 'error',
			label: 'shops.api',
			message: 'Error fetching shop details',
			error,
			data: { shopId }
		})
		throw error
	}
}

export const getMyShopBySlug = async (slug: string): Promise<ShopResponse> => {
	try {
		const response = await getApiClient().get(`/shops/my-shops/${slug}`)
		return response.data
	} catch (error: any) {
		log({
			level: 'error',
			label: 'shops.api',
			message: 'Error fetching my shop by slug',
			error,
			data: { slug }
		})
		throw error
	}
}

export const getShopBySlug = async (slug: string): Promise<ShopResponse> => {
	try {
		const response = await getApiClient().get(`/shops/${slug}`)
		return response.data
	} catch (error: any) {
		log({
			level: 'error',
			label: 'shops.api',
			message: 'Error fetching shop by slug',
			error,
			data: { slug }
		})
		throw error
	}
}

export const getShopProducts = async (shopId: string): Promise<ShopProductsResponse> => {
	try {
		const response = await getApiClient().get(`/shops/my-shops/${shopId}/products`)
		return response.data
	} catch (error: any) {
		log({
			level: 'error',
			label: 'shops.api',
			message: 'Error fetching shop products',
			error,
			data: { shopId }
		})
		throw error
	}
}

export const getShopProductsBySlug = async (slug: string): Promise<ShopProductsResponse> => {
	try {
		const response = await getApiClient().get(`/shops/${slug}/products`)
		return response.data
	} catch (error: any) {
		log({
			level: 'error',
			label: 'shops.api',
			message: 'Error fetching shop products by slug',
			error,
			data: { slug }
		})
		throw error
	}
}
