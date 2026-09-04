import type { MultiLang } from '@/core/ui/languages/languages.types'

export type { MultiLang } from '@/core/ui/languages/languages.types'

export interface Address {
	street?: MultiLang
	city: string
	region: string
	country: string
}
