import { colors as themeColors } from '@/core/theme'
export const LANGUAGES = [
	{ code: 'en', label: 'English', flag: '🇺🇸' },
	{ code: 'tn_latn', label: 'Tunisian (Latin)', flag: '🇹🇳', icon: 'A' },
	{ code: 'tn_arab', label: 'Tunisian (Arabic)', flag: '🇹🇳', icon: 'ع' }
]

export const CURRENCIES = [
	{ code: 'tnd', label: 'Tunisian Dinar', symbol: 'DT' },
	{ code: 'eur', label: 'Euro', symbol: '€' },
	{ code: 'usd', label: 'US Dollar', symbol: '$' }
]

export const SOCIAL_PLATFORMS = [
	{ id: 'facebook', label: 'Facebook', icon: 'logo-facebook', color: themeColors.facebook, prefix: 'facebook.com/' },
	{ id: 'instagram', label: 'Instagram', icon: 'logo-instagram', color: themeColors.instagram, prefix: 'instagram.com/' }
]
