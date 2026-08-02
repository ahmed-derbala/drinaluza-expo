export type LanguageCode = 'en' | 'tn_arab' | 'tn_latn'

export interface LanguageConfig {
	code: LanguageCode
	label: string
	flag: string
	letter?: string
}

export const LANGUAGES: LanguageConfig[] = [
	{ code: 'en', label: 'English', flag: '🇺🇸' },
	{ code: 'tn_latn', label: 'Tunisian (Latin)', flag: '🇹🇳', letter: 'A' },
	{ code: 'tn_arab', label: 'Tunisian (Arabic)', flag: '🇹🇳', letter: 'ع' }
]

export const getLanguageConfig = (code: string | undefined): LanguageConfig | undefined => LANGUAGES.find((l) => l.code === code)
