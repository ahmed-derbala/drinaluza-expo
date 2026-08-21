import type { MultiLang } from './languages.types'

let globalContentLang: string = 'en'

export const setGlobalContentLang = (lang: string): void => {
	globalContentLang = lang
}

export const getGlobalContentLang = (): string => globalContentLang

/**
 * Single source of truth for extracting the correct string from a
 * multi-language object based on content language.
 *
 * - Returns `''` if `value` is null/undefined
 * - Prefers `value[contentLang]` if present and non-empty
 * - Falls back to `value.en`
 * - Falls back to `''`
 */
export function getStringFromMultiLang(value?: MultiLang | null, contentLang?: string): string {
	if (!value) return ''
	const lang = contentLang || globalContentLang
	// Exact match for tn_latn / tn_arab is required — they are not normalized to `tn`
	if (lang === 'tn_latn' || lang === 'tn_arab' || lang === 'en') {
		const v = value[lang as keyof MultiLang]
		if (v) return v
	}
	// Support generic split like `en-US` → `en` (only for `en` family)
	const base = lang.split('-')[0].toLowerCase()
	if (base === 'en' && value.en) return value.en
	// Fallback to en
	return value.en || ''
}
