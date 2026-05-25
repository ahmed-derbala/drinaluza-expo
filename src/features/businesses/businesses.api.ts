import { getApiClient } from '../../core/api'
import { BusinessesResponse, CreateBusinessRequest, CreateBusinessResponse, BusinessResponse, BusinessProductsResponse, BusinessCustomersResponse } from './businesses.interface'
import { log } from '../../core/log'

export const getMyBusinesses = async (): Promise<BusinessesResponse> => {
	try {
		const response = await getApiClient().get(`/businesses/my-businesses`)
		return response.data
	} catch (error: any) {
		log({
			level: 'error',
			label: 'businesses.api',
			message: 'Error fetching my businesses',
			error
		})
		throw error
	}
}

export const getBusinesses = async (page: number = 1, limit: number = 100): Promise<BusinessesResponse> => {
	try {
		const response = await getApiClient().get(`/businesses?page=${page}&limit=${limit}`)
		return response.data
	} catch (error: any) {
		log({
			level: 'error',
			label: 'businesses.api',
			message: 'Error fetching businesses',
			error
		})
		throw error
	}
}

const createBusiness = async (businessData: CreateBusinessRequest): Promise<CreateBusinessResponse> => {
	try {
		log({
			level: 'info',
			label: 'businesses.api',
			message: 'Creating business',
			data: { name: businessData.name }
		})
		const response = await getApiClient().post(`/businesses`, businessData)
		return response.data
	} catch (error: any) {
		log({
			level: 'error',
			label: 'businesses.api',
			message: 'Error creating business',
			error,
			data: businessData
		})
		throw error
	}
}

const getBusinessDetails = async (businessId: string): Promise<BusinessResponse> => {
	try {
		const response = await getApiClient().get(`/businesses/my-businesses/${businessId}`)
		return response.data
	} catch (error: any) {
		log({
			level: 'error',
			label: 'businesses.api',
			message: 'Error fetching business details',
			error,
			data: { businessId }
		})
		throw error
	}
}

const getMyBusinessBySlug = async (slug: string): Promise<BusinessResponse> => {
	try {
		const response = await getApiClient().get(`/businesses/my-businesses/${slug}`)
		return response.data
	} catch (error: any) {
		log({
			level: 'error',
			label: 'businesses.api',
			message: 'Error fetching my business by slug',
			error,
			data: { slug }
		})
		throw error
	}
}

const updateMyBusiness = async (businessSlug: string, businessData: Partial<BusinessResponse['data']>): Promise<BusinessResponse> => {
	try {
		log({
			level: 'info',
			label: 'businesses.api',
			message: 'Updating my business',
			data: { businessSlug, businessData }
		})
		const response = await getApiClient().patch(`/businesses/my-businesses/${businessSlug}`, businessData)
		return response.data
	} catch (error: any) {
		log({
			level: 'error',
			label: 'businesses.api',
			message: 'Error updating my business',
			error,
			data: { businessSlug, businessData }
		})
		throw error
	}
}

export const updateBusiness = async (businessSlug: string, businessData: any): Promise<BusinessResponse> => {
	try {
		log({
			level: 'info',
			label: 'businesses.api',
			message: 'Updating business',
			data: { businessSlug, businessData }
		})
		const response = await getApiClient().patch(`/businesses/${businessSlug}`, businessData)
		return response.data
	} catch (error: any) {
		log({
			level: 'error',
			label: 'businesses.api',
			message: 'Error updating business',
			error,
			data: { businessSlug, businessData }
		})
		throw error
	}
}

export const getBusinessBySlug = async (slug: string): Promise<BusinessResponse> => {
	try {
		const response = await getApiClient().get(`/businesses/${slug}`)
		return response.data
	} catch (error: any) {
		log({
			level: 'error',
			label: 'businesses.api',
			message: 'Error fetching business by slug',
			error,
			data: { slug }
		})
		throw error
	}
}

const getBusinessProducts = async (businessId: string): Promise<BusinessProductsResponse> => {
	try {
		const response = await getApiClient().get(`/businesses/my-businesses/${businessId}/products`)
		return response.data
	} catch (error: any) {
		log({
			level: 'error',
			label: 'businesses.api',
			message: 'Error fetching business products',
			error,
			data: { businessId }
		})
		throw error
	}
}

export const getBusinessProductsBySlug = async (slug: string): Promise<BusinessProductsResponse> => {
	try {
		const response = await getApiClient().get(`/businesses/${slug}/products`)
		return response.data
	} catch (error: any) {
		log({
			level: 'error',
			label: 'businesses.api',
			message: 'Error fetching business products by slug',
			error,
			data: { slug }
		})
		throw error
	}
}

export const getBusinessCustomers = async (slug: string): Promise<BusinessCustomersResponse> => {
	try {
		const response = await getApiClient().get(`/businesses/${slug}/customers`)
		return response.data
	} catch (error: any) {
		log({
			level: 'error',
			label: 'businesses.api',
			message: 'Error fetching business customers',
			error,
			data: { slug }
		})
		throw error
	}
}
