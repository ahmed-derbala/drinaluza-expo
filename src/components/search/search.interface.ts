// Search-related TypeScript interfaces

export interface SearchFilters {
	category?: string
	minPrice?: number
	maxPrice?: number
	location?: string
	sortBy?: 'price' | 'date' | 'relevance'
	sortOrder?: 'asc' | 'desc'
}

export interface SearchResult {
	id: string
	type: 'product' | 'shop' | 'user'
	name: string
	description?: string
	imageUrl?: string
	price?: number
	currency?: string
	relevanceScore?: number
}

export interface SearchResponse {
	results: SearchResult[]
	total: number
	page: number
	pageSize: number
}
