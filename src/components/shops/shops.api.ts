import apiClient from '@/core/api'
import { ShopsResponse, CreateShopRequest, CreateShopResponse } from './shops.interface'

export const getMyShops = async (): Promise<ShopsResponse> => {
	const response = await apiClient.get(`/shops/my-shops`)
	return response.data
}

export const createShop = async (shopData: CreateShopRequest): Promise<CreateShopResponse> => {
	const response = await apiClient.post('/shops/create', shopData)
	return response.data
}
