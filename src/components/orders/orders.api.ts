import apiClient from '@/core/api'
import { FeedResponse } from './orders.interface'

export const getFeed = async (): Promise<FeedResponse> => {
	const response = await apiClient.get('/orders')
	return response.data
}
