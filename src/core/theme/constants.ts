/**
 * default style values for ui components
 */
import { useWindowDimensions } from 'react-native'

export const SCREEN = {
	padding: 20,
	maxWidth: 800,
	gap: 12
} as const

const CARD_SIDE_GAP = 12
const CARD_BASE_W_OFFSET = 130

export const useCardWidth = (): number => {
	const { width: screenW } = useWindowDimensions()
	const totalHPadding = SCREEN.padding + CARD_SIDE_GAP
	const isWide = screenW > SCREEN.maxWidth
	const baseW = isWide ? (Math.min(screenW, SCREEN.maxWidth) - totalHPadding * 2 - 12 * 2) / 3 : (screenW - totalHPadding * 2 - 12) / 2
	return baseW + CARD_BASE_W_OFFSET
}

/**
 * Returns card height guaranteed to be fully visible ( < windowHeight ).
 * Use for fixed carousel on wide/landscape so it never overflows viewport.
 */
export const getResponsiveCardHeight = (windowHeight: number, headerHeight = 56, insetsTop = 0, insetsBottom = 0, cardHeight = 440): number => {
	const available = windowHeight - headerHeight - insetsTop - insetsBottom - 32
	return Math.max(200, Math.min(cardHeight, available))
}

export const getCarouselPreviewHeight = (cardHeight: number): number => Math.max(120, Math.min(260, cardHeight - 140))
