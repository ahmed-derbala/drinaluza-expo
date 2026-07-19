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

export const getHarvestIcon = (val?: 'wild' | 'farm'): 'boat-outline' | 'home-outline' => {
	return val === 'wild' ? 'boat-outline' : 'home-outline'
}

export const getCaliberIconSize = (caliber: number | undefined, variant: 'chip' | 'selector' | 'badge'): number => {
	return 10 + 10 * (caliber || 3)
}

export const getCaliberFontSize = (caliber: number | undefined, variant: 'chip' | 'selector' | 'static'): number => {
	const c = caliber || 3
	if (variant === 'static') {
		return 6 + c * 1
	}
	return 5 + c * 3
}

export const getGearLabel = (val?: 'trap' | 'gillnet'): string => {
	switch (val) {
		case 'trap':
			return translate('gear_trap', 'Trap (Drina)')
		case 'gillnet':
			return translate('gear_gillnet', 'Gillnet (Ghzal)')
		default:
			return ''
	}
}
