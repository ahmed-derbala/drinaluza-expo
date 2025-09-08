import apiClient from '../../core/api'
import { FeedResponse } from './feed.interface'

export const getFeed = async (): Promise<FeedResponse> => {
	const response = await apiClient.get('/feed')
	return response.data
}
