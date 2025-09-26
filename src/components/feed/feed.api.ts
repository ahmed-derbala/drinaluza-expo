import { getApiClient } from '../../core/api'
import { FeedResponse } from './feed.interface'

export const getFeed = async (): Promise<FeedResponse> => {
	const apiClient = getApiClient()
	const response = await apiClient.get('/feed')
	return response.data
}
