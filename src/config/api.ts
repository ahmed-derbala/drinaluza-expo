import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { API_BASE_URL } from '@env'

const apiClient: AxiosInstance = axios.create({
	baseURL: API_BASE_URL || 'http://localhost:3000',
	timeout: 10000,
	headers: {
		'Content-Type': 'application/json'
	}
})

// Add a request interceptor
apiClient.interceptors.request.use(
	(config) => {
		// You can add auth token here if needed
		// const token = await getToken();
		// if (token) {
		//   config.headers.Authorization = `Bearer ${token}`;
		// }
		return config
	},
	(error) => {
		return Promise.reject(error)
	}
)

// Add a response interceptor
apiClient.interceptors.response.use(
	(response) => {
		return response
	},
	(error) => {
		// Handle errors globally
		return Promise.reject(error)
	}
)

export default apiClient
