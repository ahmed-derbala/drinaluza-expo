export interface FeedItem {
	_id: string
	createdByUser: {
		_id: string
		username: string
		createdAt: string
		updatedAt: string
	}
	business: {
		_id: string
		name: string
		createdAt: string
		updatedAt: string
	}
	shops: {
		_id: string
		name: string
		createdAt: string
		updatedAt: string
	}[]
	name: string
	unit: {
		name: string
		min: number
	}
	searchTerms: string[]
	isActive: boolean
	availability: {
		endDate: string | null
		startDate: string
	}
	createdAt: string
	updatedAt: string
	__v: number
}

export interface FeedResponse {
	status: number
	data: {
		pagination: {
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
		data: FeedItem[]
	}
}
