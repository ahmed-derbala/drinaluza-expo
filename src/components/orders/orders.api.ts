import { getApiClient } from '../../core/api'
import { OrderResponse } from './orders.interface'

export const getPurchases = async (status?: string): Promise<OrderResponse> => {
	const url = status ? `/purchases?status=${status}` : '/purchases'
	const response = await getApiClient().get(url)
	return response.data
}

export const cancelPurchaseAPI = async ({ purchaseId }: { purchaseId: string }) => {
	const response = await getApiClient().delete(`/purchases/${purchaseId}`)
	return response.data
}

export const getSales = async (page: number = 1, limit: number = 10, status?: string): Promise<OrderResponse> => {
	let url = `/sales?page=${page}&limit=${limit}`
	if (status) {
		url += `&status=${status}`
	}
	const response = await getApiClient().get(url)
	return response.data
}

export const createPurchase = async ({ products, shop }: { products: { product: any; quantity: number }[]; shop: any }) => {
	const body = {
		products,
		shop
	}
	const response = await getApiClient().post('/purchases', body)
	return response.data
}

export const updatePurchaseStatus = async ({ purchaseId, status, by }: { purchaseId: string; status?: string; by?: string }) => {
	let body: { status: string } = { status: status || 'cancelled_by_user' }
	if (!status && by === 'shop') body.status = 'cancelled_by_shop'
	const response = await getApiClient().patch(`/purchases/${purchaseId}/status`, body)
	return response.data
}

export const updateSaleStatus = async ({ saleId, status }: { saleId: string; status: string }) => {
	const response = await getApiClient().patch(`/sales/${saleId}`, { status })
	return response.data
}
