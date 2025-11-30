export interface UserProfile {
	firstName: string
	middleName: string
	lastName: string
	birthDate: Date | null
	photo: {
		url: string
	}
}

export interface UserData {
	slug: string
	name: string
	email: string
	role?: string
	phone: {
		fullNumber: string
		countryCode: string
		shortNumber: string
	}
	profile: UserProfile
	address: {
		text: string
		country: string
		city: string
		street: string
	}
	settings: {
		lang: string
		currency: string
	}
}
