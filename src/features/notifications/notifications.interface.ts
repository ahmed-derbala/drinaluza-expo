import { Customer } from '@/features/customers/customers.interface'

interface LocalizedText {
	en?: string
	tn_latn?: string
	tn_arab?: string
}

interface NotificationUser {
	_id: string
	slug: string
	name: LocalizedText
	role: string
	updatedAt: string
}

interface NotificationTemplate {
	slug: string
}

export interface NotificationItem {
	_id: string
	user: NotificationUser
	/** Populated for templates that involve a second party, e.g. `purchase_request`. */
	customer?: Customer
	template: NotificationTemplate
	screen?: string
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
