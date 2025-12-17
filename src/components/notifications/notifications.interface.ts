export interface NotificationUser {
	_id: string
	slug: string
	name: string
	role: string
}

export interface NotificationItem {
	_id: string
	user: NotificationUser
	title: string
	content: string
	at: string
	kind: string
	sendAt: string
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
			hasPrevPage: boolean
			returnedDocsCount: number
		}
		docs: NotificationItem[]
	}
}
