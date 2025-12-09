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

export const getSales = async (page: number = 1, limit: number = 10): Promise<OrderResponse> => {
	const response = await getApiClient().get(`/sales?page=${page}&limit=${limit}`)
	return response.data
}

export const createPurchase = async ({ products }: { products: any[] }) => {
	let body: { products: any[] } = { products: [] }
	body.products = products.map((product) => ({ product }))
	for (let p of body.products) {
		if (!p.quantity) p.quantity = 1
	}
	const response = await getApiClient().post('/purchases', body)
	return response.data
}

export const updatePurchaseStatus = async ({ purchaseId, by }: { purchaseId: string; by?: string }) => {
	let body: { status: string } = { status: 'cancelled_by_user' }
	if (by === 'shop') body.status = 'cancelled_by_shop'
	const response = await getApiClient().patch(`/purchases/${purchaseId}/status`, body)
	return response.data
}

export const updateSaleStatus = async ({ saleId, status }: { saleId: string; status: string }) => {
	const response = await getApiClient().patch(`/sales/${saleId}/${status}`)
	return response.data
}
