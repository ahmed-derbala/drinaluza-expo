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
