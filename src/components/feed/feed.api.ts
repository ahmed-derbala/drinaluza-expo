import { getApiClient } from '../../core/api'
import { FeedResponse } from './feed.interface'

export const getFeed = async (page: number = 1, limit: number = 10): Promise<FeedResponse> => {
	const apiClient = getApiClient()
	const response = await apiClient.get(`/feed?page=${page}&limit=${limit}`)
	return response.data
}

export const searchFeed = async (text: string, lang: 'en' | 'tn' = 'en', components: string[] = ['products']): Promise<FeedResponse> => {
	const apiClient = getApiClient()
	const response = await apiClient.post('/search', {
		text,
		lang,
		components
	})
	return response.data
}
