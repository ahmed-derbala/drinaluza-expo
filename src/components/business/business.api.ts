import { getApiClient } from '../../core/api'

import { LocalizedName } from '../shops/shops.interface'

export interface MyBusiness {
	_id: string
	name: LocalizedName
	state: {
		code: string
		updatedAt: string
	}
	slug: string
	shopsCount: number
	productsCount: number
	salessCount: number
}

export interface MyBusinessResponse {
	level: string
	status: number
	data: MyBusiness
	req: {
		headers: {
			tid: string
		}
	}
}

export const getMyBusiness = async (): Promise<MyBusinessResponse> => {
	const response = await getApiClient().get('/businesses/my-business')
	return response.data
}

export const requestBusiness = async () => {
	const response = await getApiClient().post('/businesses/requests')
	return response.data
}
