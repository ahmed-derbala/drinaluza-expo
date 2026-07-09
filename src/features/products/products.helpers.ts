import { translate } from '@/core/translation'

export const getCaliberLabel = (val?: number): string => {
	switch (val) {
		case 1:
			return translate('caliber_tiny', 'Tiny')
		case 2:
			return translate('caliber_small', 'Small')
		case 3:
			return translate('caliber_medium', 'Medium')
		case 4:
			return translate('caliber_large', 'Large')
		case 5:
			return translate('caliber_huge', 'Huge')
		default:
			return ''
	}
}
