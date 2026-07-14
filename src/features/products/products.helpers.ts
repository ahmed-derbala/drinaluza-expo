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

export const getHarvestLabel = (val?: 'wild' | 'farm'): string => {
	switch (val) {
		case 'wild':
			return translate('harvest_wild', 'Wild')
		case 'farm':
			return translate('harvest_farm', 'Farm')
		default:
			return ''
	}
}

export const getHarvestIcon = (val?: 'wild' | 'farm'): 'water-outline' | 'leaf' => {
	return val === 'wild' ? 'water-outline' : 'leaf'
}

export const getCaliberIconSize = (caliber: number | undefined, variant: 'chip' | 'selector' | 'badge'): number => {
	const bases = { chip: 6, selector: 8, badge: 12 }
	return bases[variant] + 2.2 * (caliber || 3)
}
