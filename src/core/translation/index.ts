import { en } from './en'
import { tn_latn } from './tn_latn'
import { tn_arab } from './tn_arab'

const translations: Record<string, Record<string, string>> = {
	en,
	tn_latn,
	tn_arab
}
let currentAppLang = 'en'
export const setGlobalAppLang = (lang: string) => {
	currentAppLang = lang
}
export const translate = (key: string, defaultText?: string, lang?: string): string => {
	// e.g. "en-US" -> "en"
	let targetLang = (lang || currentAppLang).split('-')[0].toLowerCase()
	// Support direct lookup for tn_latn, tn_arab if passed exactly
	if (lang === 'tn_latn' || lang === 'tn_arab') {
		targetLang = lang
	} else if (currentAppLang === 'tn_latn' || currentAppLang === 'tn_arab') {
		if (!lang) targetLang = currentAppLang
	}
	const text = translations[targetLang]?.[key] || translations['en']?.[key]
	return text || defaultText || key
}
