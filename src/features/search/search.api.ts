import { getApiClient } from '../../core/api'
import { ProductFeedItem } from '../feed/feed.interface'
import { UserFeedItem } from '../feed/feed.interface'

export interface SearchPagination {
	totalDocs: number
	totalPages: number
	page: number
	limit: number
	hasNextPage: boolean
	nextPage: number | null
	hasPrevPage: boolean
	prevPage: number | null
	returnedDocsCount: number
}

export interface SearchResponse {
	status: number
	data: {
		pagination?: SearchPagination
		docs?: Array<ProductFeedItem | UserFeedItem | any>
		products?: ProductFeedItem[] | { docs: ProductFeedItem[]; pagination?: SearchPagination }
		users?: UserFeedItem[] | { docs: UserFeedItem[]; pagination?: SearchPagination }
	}
}

/**
 * Perform a GET request to execute search.
 * Endpoint: GET /api/search?q=...&scopes=...&page=...&limit=...
 *
 * @param query Search query text
 * @param scopes Array of search scopes (e.g. ['products', 'users'])
 * @param page Current page number
 * @param limit Page size limit
 */
export const searchApi = async (query: string, scopes: string[], page: number = 1, limit: number = 10): Promise<SearchResponse> => {
	const apiClient = getApiClient()
	const scopesParam = scopes.join(',')
	const response = await apiClient.get<SearchResponse>('/search', {
		params: {
			q: query,
			scopes: scopesParam,
			page,
			limit
		}
	})
	return response.data
}
