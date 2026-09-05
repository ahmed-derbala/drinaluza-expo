import type { MultiLang } from '@languages/languages.types'

export type { MultiLang } from '@languages/languages.types'

export interface Address {
	street?: MultiLang
	city: string
	region: string
	country: string
}
