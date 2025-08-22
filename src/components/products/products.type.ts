export type ProductType = {
	_id: string
	createdByUser: {
		_id: string
		username: string
		createdAt: string
		updatedAt: string
	}
	business: {
		_id: string
		name: string
		createdAt: string
		updatedAt: string
	}
	shop: {
		_id: string
		name: string
		createdAt: string
		updatedAt: string
	}
	name: string
	unit: {
		name: string
		min: number
	}
	searchTerms: string[]
	isActive: boolean
	availability: {
		endDate: string | null
		startDate: string
	}
	createdAt: string
	updatedAt: string
}
