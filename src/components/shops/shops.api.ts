import { getApiClient } from '../../core/api'
import { ShopsResponse, CreateShopRequest, CreateShopResponse, ShopResponse, ShopProductsResponse } from './shops.interface'

export const getMyShops = async (): Promise<ShopsResponse> => {
	try {
		const response = await getApiClient().get(`/shops/my-shops`)
		return response.data
	} catch (error: any) {
		console.error('Error in getMyShops:', error)
		throw error
	}
}

export const createShop = async (shopData: CreateShopRequest): Promise<CreateShopResponse> => {
	try {
		const response = await getApiClient().post('/shops', shopData)
		return response.data
	} catch (error: any) {
		console.error('Error creating shop:', error)
		throw error
	}
}

export const getShopDetails = async (shopId: string): Promise<ShopResponse> => {
	try {
		const response = await getApiClient().get(`/shops/my-shops/${shopId}`)
		return response.data
	} catch (error: any) {
		console.error('Error fetching shop details:', error)
		throw error
	}
}

export const getShopProducts = async (shopId: string): Promise<ShopProductsResponse> => {
	try {
		const response = await getApiClient().get(`/shops/my-shops/${shopId}/products`)
		return response.data
	} catch (error: any) {
		console.error('Error fetching shop products:', error)
		throw error
	}
}
