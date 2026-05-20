import { getApiClient } from '../../core/api'
import { DashboardProfilesResponse, DashboardResponse } from './dashboard.interface'

export const getDashboardProfiles = async (): Promise<DashboardProfilesResponse> => {
	const response = await getApiClient().get('/dashboard/profiles')
	return response.data
}

export const getDashboard = async (): Promise<DashboardResponse> => {
	const response = await getApiClient().get('/dashboard')
	return response.data
}

export const getPersonalDashboard = async (): Promise<DashboardResponse> => {
	const response = await getApiClient().get('/dashboard/personal')
	return response.data
}

export const getBusinessDashboard = async (businessSlug: string): Promise<DashboardResponse> => {
	const response = await getApiClient().get(`/dashboard/business/${businessSlug}`)
	return response.data
}
