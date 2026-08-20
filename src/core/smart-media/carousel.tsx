/**
 * SmartMediaCarousel — displays `media.thumbnail` plus `media.gallery`
 * in a selectable, horizontally swipeable strip with a main preview.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { themeColors } from '@/core/theme'
import { getMediaUrl, type MediaField, type MediaFile } from './types'
import SmartMediaView from './view'

export interface SmartMediaCarouselProps {
	media?: MediaField | null
	style?: StyleProp<ViewStyle>
	/** Content fit for the main preview and thumbnails. Defaults to 'cover'. */
	contentFit?: 'cover' | 'contain' | 'fill'
	/** Whether to show the thumbnail strip. Defaults to true. */
	showThumbnails?: boolean
	/** Auto-advance interval in milliseconds (0 disables it). Defaults to 0. */
	autoAdvanceMs?: number
	/** Called whenever the active item changes. */
	onIndexChange?: (index: number) => void
	/** Whether the main preview opens the fullscreen lightbox. Defaults to true. */
	enableFullscreenPreview?: boolean
	accessibilityLabel?: string
}

const collectItems = (media?: MediaField | null): MediaFile[] => {
	if (!media) return []
	const items: MediaFile[] = []
	if (media.thumbnail && getMediaUrl(media.thumbnail)) items.push(media.thumbnail)
	if (Array.isArray(media.gallery)) {
		for (const file of media.gallery) {
			if (getMediaUrl(file)) items.push(file)
		}
	}
	return items
}

const SmartMediaCarouselComponent = ({
	media,
	style,
	contentFit = 'cover',
	showThumbnails = true,
	autoAdvanceMs = 0,
	onIndexChange,
	enableFullscreenPreview = true,
	accessibilityLabel
}: SmartMediaCarouselProps) => {
	const items = useMemo(() => collectItems(media), [media])
	const [activeIndex, setActiveIndex] = useState(0)

	// Reset the active index when the media set changes.
	useEffect(() => {
		setActiveIndex(0)
	}, [media])

	const activeItem = items[activeIndex] ?? null

	useEffect(() => {
		if (autoAdvanceMs <= 0 || items.length <= 1) return
		const timer = setInterval(() => {
			setActiveIndex((current) => {
				const next = (current + 1) % items.length
				onIndexChange?.(next)
				return next
			})
		}, autoAdvanceMs)
		return () => clearInterval(timer)
	}, [autoAdvanceMs, items.length, onIndexChange])

	const selectIndex = useCallback(
		(index: number) => {
			setActiveIndex(index)
			onIndexChange?.(index)
		},
		[onIndexChange]
	)

	if (items.length === 0) {
		return (
			<View style={[styles.container, style]} accessibilityLabel={accessibilityLabel}>
				<SmartMediaView media={null} contentFit={contentFit} style={StyleSheet.absoluteFill} />
			</View>
		)
	}

	return (
		<View style={[styles.container, style]} accessibilityLabel={accessibilityLabel}>
			<View style={styles.preview}>
				<SmartMediaView media={activeItem} contentFit={contentFit} style={StyleSheet.absoluteFill} enableFullscreenPreview={enableFullscreenPreview} autoPlay={false} />
			</View>

			{showThumbnails && items.length > 1 && (
				<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.stripContent}>
					{items.map((item, index) => {
						const isActive = index === activeIndex
						return (
							<TouchableOpacity
								key={item._id || index}
								onPress={() => selectIndex(index)}
								style={[styles.thumbnail, isActive && styles.thumbnailActive]}
								accessibilityRole="button"
								accessibilityLabel={item.name || `Media ${index + 1}`}
							>
								<SmartMediaView media={item} contentFit="cover" style={StyleSheet.absoluteFill} />
							</TouchableOpacity>
						)
					})}
				</ScrollView>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		width: '100%',
		overflow: 'hidden'
	},
	preview: {
		width: '100%',
		aspectRatio: 1,
		backgroundColor: themeColors.background
	},
	strip: {
		marginTop: 8
	},
	stripContent: {
		gap: 8,
		paddingHorizontal: 2
	},
	thumbnail: {
		width: 56,
		height: 56,
		borderRadius: 10,
		overflow: 'hidden',
		borderWidth: 2,
		borderColor: themeColors.border
	},
	thumbnailActive: {
		borderColor: themeColors.primary
	}
})

export const SmartMediaCarousel = React.memo(SmartMediaCarouselComponent)
export default SmartMediaCarousel
