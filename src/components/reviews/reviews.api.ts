import { getApiClient } from '../../core/api'
import { ReviewsResponse, CreateReviewRequest, CreateReviewResponse } from './reviews.interface'

export const getReviews = async (targetResource: 'shops' | 'products' | 'users', targetId: string, page: number = 1, limit: number = 10): Promise<ReviewsResponse> => {
	const apiClient = getApiClient()
	const response = await apiClient.get(`/reviews/${targetResource}/${targetId}?page=${page}&limit=${limit}`)
	return response.data
}

export const createReview = async (targetResource: 'shops' | 'products' | 'users', targetId: string, data: CreateReviewRequest, isAnonymous: boolean = false): Promise<CreateReviewResponse> => {
	const apiClient = getApiClient()
	const response = await apiClient.post(`/reviews/${targetResource}/${targetId}`, data, {
		headers: isAnonymous ? { skipAuth: true } : undefined
	})
	return response.data
}
