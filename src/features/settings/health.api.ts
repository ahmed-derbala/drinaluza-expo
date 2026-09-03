import { getApiClient } from '@/core/api'

export interface HealthData {
	node: {
		env: string
		version: string
	}
	app: {
		name: string
		version: string
	}
	uptime: string
	socketio: {
		publicClientsCount: number
		privateClientsCount: number
	}
}

export interface HealthResponse {
	data: HealthData
}

export const getHealth = async (): Promise<HealthResponse> => {
	const response = await getApiClient({ prefix: '/' }).get('/health', { headers: { skipAuth: true } })
	return response.data
}
