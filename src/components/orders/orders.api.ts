import apiClient from '../../core/api'
import { OrderResponse } from './orders.interface'

export const getOrder = async (): Promise<OrderResponse> => {
	const response = await apiClient.get('/orders')
	return response.data
}

export const cancelOrderAPI = async ({ orderId }: { orderId: string }) => {
	const response = await apiClient.delete(`/orders/${orderId}`)
	return response.data
}

export const getSales = async (page: number = 1, limit: number = 10): Promise<OrderResponse> => {
	const response = await apiClient.get(`/orders/sales?page=${page}&limit=${limit}`)
	return response.data
}

export const createOrder = async ({ products }: { products: any[] }) => {
	let body: { products: any[] } = { products: [] }
	body.products = products.map((product) => ({ product }))
	for (let p of body.products) {
		if (!p.quantity) p.quantity = 1
	}
	//console.log('body',body)
	const response = await apiClient.post('/orders', body)
	return response.data
}

export const updateOrderStatus = async ({ orderId, by }: { orderId: string; by?: string }) => {
	let body: { status: string } = { status: 'cancelled_by_user' }
	if (by === 'shop') body.status = 'cancelled_by_shop'
	const response = await apiClient.patch(`/orders/${orderId}/status`, body)
	return response.data
}

export const updateSaleOrderStatus = async ({ orderId, status }: { orderId: string; status: string }) => {
	const response = await apiClient.patch(`/orders/sales/${orderId}/${status}`)
	return response.data
}
