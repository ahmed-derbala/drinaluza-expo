import { getApiClient } from '@api'
import { FeedItem, NormalizedFeedResponse } from './feed.interface'
/**
 * Normalizes a raw feed doc from the API into a FeedItem
 * that UI components can consume directly. Docs arrive flat —
 * ensure slug is properly set and card defaults are applied.
 */
const normalizeFeedDoc = (doc: any): FeedItem => {
	return {
		...doc,
		slug: doc.slug || doc._id,
		card: {
			kind: doc.card?.kind || 'product',
			purchase: doc.card?.purchase
		}
	} as FeedItem
}
const normalizeResponse = (response: any): NormalizedFeedResponse => {
	const docs = Array.isArray(response.data) ? response.data.map(normalizeFeedDoc) : Array.isArray(response.data?.docs) ? response.data.docs.map(normalizeFeedDoc) : []
	return {
		status: response.status,
		data: {
			pagination: Array.isArray(response.data) ? undefined : response.data?.pagination,
			docs
		}
	}
}
export const getFeed = async (page: number = 1, limit: number = 10, filter?: string): Promise<NormalizedFeedResponse> => {
	const apiClient = getApiClient()
	let url = `/feed?page=${page}&limit=${limit}`
	if (filter) {
		url += `&filter=${filter}`
	}
	const response = await apiClient.get(url)
	return normalizeResponse(response.data)
}
export const searchFeed = async (text: string, lang: 'en' | 'tn' = 'en', components: string[] = ['products']): Promise<NormalizedFeedResponse> => {
	const apiClient = getApiClient()
	const response = await apiClient.post('/search', {
		text,
		lang,
		components
	})
	return normalizeResponse(response.data)
}
