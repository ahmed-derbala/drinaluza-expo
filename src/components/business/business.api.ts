import { getApiClient } from '../../core/api'
import { LocalizedName } from '../businesses/businesses.interface'

export const requestBusiness = async (businessName?: LocalizedName) => {
	const response = await getApiClient().post('/businesses/requests', businessName ? { name: businessName } : undefined)
	return response.data
}
