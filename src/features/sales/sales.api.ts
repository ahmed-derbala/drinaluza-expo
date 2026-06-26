import { getApiClient } from '../../core/api'
import { parseError } from '../../core/helpers/errorHandler'

const apiClient = getApiClient()

export interface SalesResponse {
	level?: string
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
		docs: Sale[]
	}
	req?: {
		headers: {
			tid: string
		}
	}
}

interface SaleProduct {
	product: {
		_id: string
		name: {
			en: string
			tn_latn?: string
			tn_arab?: string
		}
		media?: {
			thumbnail?: {
				url: string
			}
			updatedAt?: string
		}
		defaultProduct?: {
			_id: string
			slug: string
			name: {
				en: string
				tn_latn?: string
				tn_arab?: string
			}
			media?: {
				thumbnail?: {
					url: string
				}
				updatedAt?: string
			}
			updatedAt?: string
		}
		price?: {
			total: {
				tnd: number
				eur: number | null
				usd: number | null
				updatedAt?: string
			}
			updatedAt?: string
		}
		unit?: {
			measure: string
			min: number
			max: number
			updatedAt?: string
		}
		updatedAt?: string
	}
	quantity: number
	lineTotal: {
		tnd: number
		eur: number | null
		usd: number | null
		updatedAt?: string
	}
}

export interface Sale {
	_id: string
	business: {
		_id: string
		name: {
			en: string
		}
		slug: string
		address?: {
			street: string
			city: string
			state: string
			country: string
		}
		location?: {
			geo?: { type: 'Point'; coordinates: [number, number] }
			accuracy?: number
			altitude?: number
			heading?: number
			speed?: number
			deviceTimestamp?: string
			sharingEnabled: boolean
			updatedAt?: string
		}
		owner?: {
			_id: string
			slug: string
			name: {
				en: string
			}
			business?: {
				_id: string
				slug: string
				name: {
					en: string
				}
			}
		}
		createdAt?: string
		updatedAt?: string
	}
	customer: {
		_id: string
		role: string
		slug: string
		name: {
			en: string
		}
		address?: {
			street: string
			city: string
			state: string
			country: string
		}
		location?: {
			geo?: { type: 'Point'; coordinates: [number, number] }
			accuracy?: number
			altitude?: number
			heading?: number
			speed?: number
			deviceTimestamp?: string
			sharingEnabled: boolean
			updatedAt?: string
		}
		contact?: {
			phone?: {
				fullNumber: string
				countryCode: string
				localNumber: string
				createdAt?: string
				updatedAt?: string
			}
			backupPhones?: Array<{
				fullNumber: string
				countryCode: string
				localNumber: string
				createdAt?: string
				updatedAt?: string
			}>
			whatsapp?: string
			email?: string
			createdAt?: string
			updatedAt?: string
		}
		media?: {
			thumbnail?: {
				url: string
			}
		}
		updatedAt?: string
	}
	products: SaleProduct[]
	status: string
	price: {
		total: {
			tnd: number
			eur: number
			usd: number
			updatedAt?: string
		}
		updatedAt?: string
	}
	createdAt: string
	updatedAt: string
	__v?: number
}

export const getSales = async (businessSlug: string, page = 1, limit = 10, status?: string, customerSlug?: string, productSlug?: string): Promise<SalesResponse> => {
	try {
		const response = await apiClient.get('sales', {
			params: {
				businessSlug,
				page,
				limit,
				...(status ? { status } : {}),
				...(customerSlug ? { customerSlug } : {}),
				...(productSlug ? { productSlug } : {})
			}
		})
		return response.data
	} catch (error) {
		throw parseError(error)
	}
}

export const updateSaleStatus = async (orderId: string, status: string): Promise<any> => {
	try {
		const response = await apiClient.patch(`sales/${orderId}`, { status })
		return response.data
	} catch (error) {
		throw parseError(error)
	}
}
