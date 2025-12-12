export interface BasicInfos {
	firstName: string
	lastName: string
	birthDate: Date | null
	biography?: string
	photo?: {
		url: string
	} | null
}

export interface Address {
	street: string
	city: string
	state: string
	postalCode: string
	country: string
}

export interface UserData {
	_id: string
	slug: string
	name: string
	email?: string
	role: string
	isActive: boolean
	basicInfos: BasicInfos
	address: Address
	settings: {
		lang: string
		currency: string
	}
	createdAt: string
	updatedAt: string
}
