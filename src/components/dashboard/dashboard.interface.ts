import { LocalizedName } from '../businesses/businesses.interface'

export type DashboardProfileKind = 'personal' | 'business'

export type DashboardProfile = {
	_id: string
	slug?: string
	name: LocalizedName
	role?: string
	kind: DashboardProfileKind
	media?: {
		thumbnail?: { url: string }
		_id?: string
	}
}

export type DashboardUserRef = {
	_id: string
	slug: string
	name: LocalizedName
	role: string
}

export type DashboardBusinessRef = {
	_id: string
	owner?: DashboardUserRef
	name: LocalizedName
	slug: string
	media?: {
		thumbnail?: { url: string }
		_id?: string
	}
}

export type ProductStats = {
	count: number
	lowStock: number
	outOfStock: number
}

export type DashboardRankItem = {
	_id?: string
	name?: LocalizedName
	slug?: string
	count?: number
	views?: number
	media?: { thumbnail?: { url: string } }
	[key: string]: unknown
}

export type PersonalDashboard = {
	_id: string
	user: DashboardUserRef
	kind: 'personal'
	topBusinesses: { new: DashboardRankItem[]; frequent: DashboardRankItem[] }
	createdAt: string
	updatedAt: string
}

export type BusinessDashboard = {
	_id: string
	user: DashboardUserRef
	kind: 'business'
	business: DashboardBusinessRef
	products: ProductStats
	topProducts: { selling: DashboardRankItem[]; viewed: DashboardRankItem[] }
	topCustomers: { frequent: DashboardRankItem[]; new: DashboardRankItem[] }
	createdAt: string
	updatedAt: string
}

export type DashboardData = PersonalDashboard | BusinessDashboard

export type DashboardProfilesResponse = {
	status: number
	data: DashboardProfile[]
}

export type DashboardResponse = {
	status: number
	data: DashboardData
}

export const isBusinessDashboard = (data: DashboardData): data is BusinessDashboard => data.kind === 'business'

export const isPersonalDashboard = (data: DashboardData): data is PersonalDashboard => data.kind === 'personal'
