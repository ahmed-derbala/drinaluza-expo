import { getApiClient } from '../../core/api'
import { FeedItem, FeedResponse, NormalizedFeedResponse, RawFeedDoc } from './feed.interface'

/**
 * Transforms a raw feed doc from the API into a normalized FeedItem
 * that UI components can consume directly.
 */
const normalizeFeedDoc = (doc: any): FeedItem => {
	// Search results come as flat docs without targetData wrapper — ensure slug is properly set
	if (!doc.targetData) {
		return {
			...doc,
			slug: doc.slug || doc._id,
			card: {
				kind: doc.card?.kind || 'product',
				purchase: doc.card?.purchase
			}
		} as FeedItem
	}

	const { targetData, targetResource, card, _id, createdAt, updatedAt, __v } = doc

	if (targetResource === 'product') {
		const { _id: productId, shop, defaultProduct, slug, name, price, unit, searchKeywords, state, availability, stock, media } = targetData

		return {
			_id: productId || _id,
			feedId: _id,
			shop,
			defaultProduct,
			slug,
			name,
			price,
			unit,
			searchTerms: searchKeywords || [],
			state,
			availability,
			stock,
			media,
			createdAt,
			updatedAt,
			__v,
			card: {
				kind: card?.kind || targetResource || 'product',
				purchase: card?.purchase
			}
		}
	}

	if (targetResource === 'shop') {
		const { owner, name, address, location, media, contact, _id: shopId, slug, createdAt: shopCreatedAt, updatedAt: shopUpdatedAt } = targetData

		return {
			_id: shopId || _id,
			feedId: _id,
			shop: {
				_id: shopId || _id,
				name,
				slug,
				owner,
				address,
				location,
				createdAt: shopCreatedAt || createdAt,
				updatedAt: shopUpdatedAt || updatedAt
			},
			name,
			slug: slug || '',
			media,
			contact,
			createdAt,
			updatedAt,
			__v,
			card: { kind: card?.kind || targetResource || 'product' }
		}
	}

	if (targetResource === 'user') {
		const { slug, name, role, address, location, media, contact, _id: userId, shops, state, createdAt: userCreatedAt, updatedAt: userUpdatedAt } = targetData

		return {
			_id: userId || _id,
			feedId: _id,
			slug: slug || '',
			name,
			role,
			address,
			location,
			media,
			contact,
			shops: shops || [],
			state,
			createdAt,
			updatedAt,
			__v,
			card: { kind: card?.kind || targetResource || 'product' }
		}
	}

	// Fallback for unknown targetResource types
	return {
		_id,
		slug: targetData?.slug || '',
		name: targetData?.name,
		media: targetData?.media,
		createdAt,
		updatedAt,
		__v,
		card: { kind: card?.kind || targetResource || 'product' }
	}
}

const normalizeResponse = (response: FeedResponse): NormalizedFeedResponse => {
	return {
		status: response.status,
		data: {
			pagination: response.data.pagination,
			docs: response.data.docs.map(normalizeFeedDoc)
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
