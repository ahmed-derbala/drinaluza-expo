import { LocalizedName } from '../shops/shops.interface'

export interface ReviewAuthor {
	_id: string
	slug: string
	name: LocalizedName
}

export interface Review {
	_id: string
	stars: number
	comment: string
	author: ReviewAuthor
	targetId: string
	targetResource: 'shops' | 'products' | 'users'
	createdAt: string
	updatedAt: string
	__v: number
}

export interface ReviewPagination {
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

export interface ReviewsResponse {
	status: number
	data: {
		pagination: ReviewPagination
		docs: Review[]
	}
}

export interface CreateReviewRequest {
	comment: string
	stars: number
}

export interface CreateReviewResponse {
	status: number
	data: Review
}
