import { getApiClient } from '@api'
import { MultiLang } from '@businesses/businesses.interface'

export const requestBusiness = async (businessName?: MultiLang) => {
	const response = await getApiClient().post('/businesses/requests', businessName ? { name: businessName } : undefined)
	return response.data
}
