import { getApiClient } from '@/core/api'
import { MultiLang } from '@/features/businesses/businesses.interface'

export const requestBusiness = async (businessName?: MultiLang) => {
	const response = await getApiClient().post('/businesses/requests', businessName ? { name: businessName } : undefined)
	return response.data
}
