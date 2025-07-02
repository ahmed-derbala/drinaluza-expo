import apiClient from '@/core/api'
import { OrderResponse } from './orders.interface'

export const getOrder = async (): Promise<OrderResponse> => {
	const response = await apiClient.get('/orders')
	return response.data
}

export const createOrder = async ({ products }) => {
	let body = {}
	body.products = products.map((product) => ({ product }))
	for (let p of body.products) {
		if (!p.quantity) p.quantity = 1
	}
	//console.log('body',body)
	const response = await apiClient.post('/orders', body)
	return response.data
}

export const cancelOrderAPI = async ({ orderId, by }) => {
	let body = {}
	let status = 'cancelled_by_user'
	if (by === 'shop') status = 'cancelled_by_shop'
	body.status = status
	const response = await apiClient.patch('/orders/${orderId}/status', body)
	return response.data
}
