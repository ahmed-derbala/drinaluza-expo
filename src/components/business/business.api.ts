import { getApiClient } from '../../core/api'

export interface BusinessStatsResponse {
	level: string
	status: number
	data: {
		shopsCount: number
		productsCount: number
		salessCount: number
	}
	req: {
		headers: {
			tid: string
		}
	}
}

export const getMyBusinessStats = async (): Promise<BusinessStatsResponse> => {
	const response = await getApiClient().get('/businesses/my-business')
	return response.data
}

export const requestBusiness = async () => {
	const response = await getApiClient().post('/businesses/requests')
	return response.data
}
