export type LocalizedName = {
	en: string
	tn_latn: string
	tn_arab: string
}

export interface Address {
	street?: LocalizedName
	city: string
	region: string
	country: string
}
