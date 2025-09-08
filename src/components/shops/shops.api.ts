import apiClient from '../../core/api'
import { ShopsResponse, CreateShopRequest, CreateShopResponse, ShopResponse, ShopProductsResponse } from './shops.interface'

export const getMyShops = async (): Promise<ShopsResponse> => {
	try {
		console.log('🔄 Fetching shops from API...')
		const response = await apiClient.get(`/shops/my-shops`)
		console.log('✅ Shops API response status:', response.status)
		return response.data
	} catch (error: any) {
		console.error('❌ Error in getMyShops:', {
			message: error.message,
			status: error.response?.status,
			data: error.response?.data,
			url: error.config?.url,
			method: error.config?.method
		})
		throw error
	}
}

export const createShop = async (shopData: CreateShopRequest): Promise<CreateShopResponse> => {
	try {
		console.log('🆕 Creating shop with data:', shopData)
		const response = await apiClient.post('/shops/create', shopData)
		console.log('✅ Shop created successfully:', response.data)
		return response.data
	} catch (error: any) {
		console.error('❌ Error creating shop:', {
			message: error.message,
			status: error.response?.status,
			data: error.response?.data,
			shopData: shopData
		})
		throw error
	}
}

export const getShopDetails = async (shopId: string): Promise<ShopResponse> => {
	try {
		console.log(`🔄 Fetching details for shop ${shopId}...`)
		const response = await apiClient.get(`/shops/my-shops/${shopId}`)
		console.log('✅ Shop details fetched successfully')
		return response.data
	} catch (error: any) {
		console.error('❌ Error fetching shop details:', {
			message: error.message,
			status: error.response?.status,
			data: error.response?.data,
			shopId
		})
		throw error
	}
}

export const getShopProducts = async (shopId: string): Promise<ShopProductsResponse> => {
	try {
		console.log(`🔄 Fetching products for shop ${shopId}...`)
		const response = await apiClient.get(`/shops/my-shops/${shopId}/products`)
		console.log('✅ Shop products fetched successfully')
		return response.data
	} catch (error: any) {
		console.error('❌ Error fetching shop products:', {
			message: error.message,
			status: error.response?.status,
			data: error.response?.data,
			shopId
		})
		throw error
	}
}
