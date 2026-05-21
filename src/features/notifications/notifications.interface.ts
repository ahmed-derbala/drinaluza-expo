export interface LocalizedText {
	en?: string
	tn_latn?: string
	tn_arab?: string
}

export interface NotificationUser {
	_id: string
	slug: string
	name: LocalizedText
	role: string
	updatedAt: string
}

export interface NotificationTemplate {
	slug: string
}

export interface NotificationItem {
	_id: string
	user: NotificationUser
	template: NotificationTemplate
	title: LocalizedText
	content: LocalizedText
	priority?: 'low' | 'medium' | 'high'
	seenAt?: string | null
	createdAt: string
	updatedAt: string
	__v: number
}

export interface NotificationResponse {
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
		docs: NotificationItem[]
	}
}
