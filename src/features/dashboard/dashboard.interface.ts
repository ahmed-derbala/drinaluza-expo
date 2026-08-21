import type { LocalizedName, Address } from '@/features/common/address'

export type DashboardProfileKind = 'personal' | 'business'

type DashboardUserRef = {
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
	address?: Address
	location?: {
		geo?: {
			type: 'Point'
			coordinates: [number, number]
		}
		sharingEnabled?: boolean
		[key: string]: unknown
	}
	media?: {
		thumbnail?: { url: string }
		_id?: string
	}
	contact?: {
		phone?: { fullNumber?: string }
		email?: string
		whatsapp?: string
		[key: string]: unknown
	}
	qrcode?: {
		_id?: string
		name?: string
		url: string
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

export type PersonalDashboard = {
	_id: string
	user: DashboardUserRef
	kind: 'personal'
	topBusinesses: { new: DashboardRankItem[]; frequent: DashboardRankItem[] }
	createdAt: string
	updatedAt: string
}

export type DashboardData = BusinessDashboard | PersonalDashboard

/** A dashboard profile as returned by GET /api/dashboard/profiles. */
export type DashboardProfile = BusinessDashboard | PersonalDashboard

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

/** Sort profiles deterministically: personal first, then businesses alphabetically by name. */
export const sortDashboardProfiles = (profiles: DashboardProfile[], localize: (name?: LocalizedName) => string): DashboardProfile[] =>
	[...profiles].sort((a, b) => {
		if (a.kind !== b.kind) return a.kind === 'personal' ? -1 : 1
		const nameA = a.kind === 'business' ? localize(a.business.name) : localize(a.user.name)
		const nameB = b.kind === 'business' ? localize(b.business.name) : localize(b.user.name)
		return nameA.localeCompare(nameB)
	})
