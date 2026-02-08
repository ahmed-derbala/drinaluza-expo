// Profile-related API calls
import { getApiClient } from '@/core/api'
import { User } from './profile.interface'

const api = getApiClient()

export interface ProfileUpdateData {
	name?: string
	email?: string
	phone?: string
	bio?: string
	imageUrl?: string
}

export interface BusinessRequest {
	businessName: string
}

/**
 * Get user profile
 */
export const getProfile = async (): Promise<User> => {
	const response = await api.get('/profile')
	return response.data
}

/**
 * Update user profile
 */
export const updateProfile = async (data: ProfileUpdateData): Promise<User> => {
	const response = await api.put('/profile', data)
	return response.data
}

/**
 * Request business account
 */
export const requestBusiness = async (data: BusinessRequest): Promise<void> => {
	await api.post('/profile/request-business', data)
}

/**
 * Upload profile image
 */
export const uploadProfileImage = async (imageUri: string): Promise<string> => {
	const formData = new FormData()
	formData.append('image', {
		uri: imageUri,
		type: 'image/jpeg',
		name: 'profile.jpg'
	} as any)

	const response = await api.post('/profile/upload-image', formData, {
		headers: {
			'Content-Type': 'multipart/form-data'
		}
	})

	return response.data.imageUrl
}
