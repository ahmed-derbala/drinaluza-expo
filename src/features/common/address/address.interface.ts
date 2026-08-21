import type { MultiLang } from '@/features/common/languages/languages.types'

export type { MultiLang } from '@/features/common/languages/languages.types'

export interface Address {
	street?: MultiLang
	city: string
	region: string
	country: string
}
