/**
 * default style values for ui components
 */
import { Dimensions } from 'react-native'

export const SCREEN = {
	padding: 20,
	maxWidth: 800
} as const

const { width: __SCREEN_W } = Dimensions.get('window')
const __TOTAL_H_PADDING = SCREEN.padding + 12
const __IS_WIDE = __SCREEN_W > SCREEN.maxWidth
const __BASE_W = __IS_WIDE ? (Math.min(__SCREEN_W, SCREEN.maxWidth) - __TOTAL_H_PADDING * 2 - 12 * 2) / 3 : (__SCREEN_W - __TOTAL_H_PADDING * 2 - 12) / 2

export const CARD = {
	minHeight: 440,
	height: 440,
	width: __BASE_W + 130,
	borderRadius: 20,
	borderWidth: 1,
	padding: 12,
	gap: 16
} as const

/**
 * Returns card height guaranteed to be fully visible ( < windowHeight ).
 * Use for fixed carousel on wide/landscape so it never overflows viewport.
 */
export const getResponsiveCardHeight = (windowHeight: number, headerHeight = 56, insetsTop = 0, insetsBottom = 0): number => {
	const available = windowHeight - headerHeight - insetsTop - insetsBottom - 32
	return Math.max(200, Math.min(CARD.height, available))
}

export const getCarouselPreviewHeight = (cardHeight: number): number => Math.max(120, Math.min(260, cardHeight - 140))

export const BUTTON = {} as const
export const HEADER_BUTTON = {} as const
export const TEXT = {} as const
export const LIST = {} as const
export const ITEM = {} as const
export const BAR = {} as const
export const ICON = {} as const
export const IMAGE = {} as const
export const VIDEO = {} as const
export const BADGE = {} as const
export const TAB = {} as const
export const LABEL = {} as const
export const CONTAINER = {} as const
export const MODAL = {} as const
export const FORM = {} as const
