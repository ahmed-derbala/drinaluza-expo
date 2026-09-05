import { getApiClient } from '@api'
import { UserResponse } from './users.interface'

export const getUserBySlug = async (userSlug: string): Promise<UserResponse> => {
	const response = await getApiClient().get(`/users/${userSlug}`)
	return response.data
}
