import { en } from './en'
import { tn_latn } from './tn_latn'
import { tn_arab } from './tn_arab'
import { fr } from './fr'
import { ar } from './ar'

export type LanguageCode = 'en' | 'tn_latn' | 'tn_arab' | 'fr' | 'ar'

export const translations: Record<string, Record<string, string>> = {
	en,
	tn_latn,
	tn_arab,
	fr,
	ar
}

let currentAppLang = 'en'

export const setGlobalAppLang = (lang: string) => {
	currentAppLang = lang
}

export const getGlobalAppLang = () => currentAppLang

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

/**
 * Localizes a dynamic name object that comes from the backend.
 * The backend object has the form { en: string, tn_latn?: string, tn_arab?: string }
 */
export const localizeName = (name?: any, contentLang?: string): string => {
	if (!name) return ''

	const lang = contentLang || currentAppLang

	// Try to get exactly requested language
	if (name[lang]) {
		return name[lang]
	}

	// Fallbacks
	return name['en'] || ''
}
