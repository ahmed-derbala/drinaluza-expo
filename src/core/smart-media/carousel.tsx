/**
 * SmartMediaCarousel — displays `media.gallery` when not empty, otherwise `media.thumbnail`,
 * in a selectable, horizontally swipeable strip with a main preview.
 *
 * Auto-play behaviour (enabled by default when there are multiple items):
 * - Images are shown for IMAGE_DISPLAY_MS (4 s) then the carousel advances.
 * - Videos play to completion, then the carousel advances.
 * - Tapping any thumbnail permanently stops auto-play for the carousel instance.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { themeColors } from '@/core/theme'
import { getMediaUrl, isVideoMedia, type MediaField, type MediaFile } from './types'
import SmartMediaView from './view'

/** How long an image is displayed before auto-advancing. */
const IMAGE_DISPLAY_MS = 2_000

export interface SmartMediaCarouselProps {
	media?: MediaField | null
	style?: StyleProp<ViewStyle>
	/** Override style for the main preview area. Use to customise aspect ratio or sizing. */
	previewStyle?: StyleProp<ViewStyle>
	/** Content fit for the main preview and thumbnails. Defaults to 'cover'. */
	contentFit?: 'cover' | 'contain' | 'fill'
	/** Whether to show the thumbnail strip. Defaults to true. */
	showThumbnails?: boolean
	/** Enable automatic slideshow (images 4 s, videos until end). Defaults to true. */
	autoPlay?: boolean
	/** Called whenever the active item changes. */
	onIndexChange?: (index: number) => void
	/** Whether the main preview opens the fullscreen lightbox. Defaults to true. */
	enableFullscreenPreview?: boolean
	accessibilityLabel?: string
	/** When true, thumbnails overlay the preview at the bottom (useful for background cards). */
	overlayThumbnails?: boolean
	/** Custom style for the thumbnail strip container. */
	stripStyle?: StyleProp<ViewStyle>
	/** Custom content container style for the thumbnail strip. */
	stripContentStyle?: StyleProp<ViewStyle>
	/** Custom style for each thumbnail. */
	thumbnailStyle?: StyleProp<ViewStyle>
	/** Custom style for the active thumbnail. */
	thumbnailActiveStyle?: StyleProp<ViewStyle>
	/** Whether to show video controls (native + custom play button). Defaults to true. */
	controls?: boolean
	/** Whether the carousel is currently visible on screen. When false, videos are not mounted. */
	isVisible?: boolean
}

const collectItems = (media?: MediaField | null): MediaFile[] => {
	if (!media) return []
	const items: MediaFile[] = []
	const hasValidGallery = Array.isArray(media.gallery) && media.gallery.some((file) => !!getMediaUrl(file as any))
	if (hasValidGallery) {
		for (const file of media.gallery as MediaFile[]) {
			if (getMediaUrl(file)) items.push(file)
		}
	} else if (media.thumbnail && getMediaUrl(media.thumbnail)) {
		items.push(media.thumbnail)
	}
	return items
}

const SmartMediaCarouselComponent = ({
	media,
	style,
	previewStyle,
	contentFit = 'cover',
	showThumbnails = true,
	autoPlay = true,
	onIndexChange,
	enableFullscreenPreview = true,
	accessibilityLabel,
	overlayThumbnails = false,
	stripStyle,
	stripContentStyle,
	thumbnailStyle,
	thumbnailActiveStyle,
	controls = true,
	isVisible = true
}: SmartMediaCarouselProps) => {
	const items = useMemo(() => collectItems(media), [media])
	const [activeIndex, setActiveIndex] = useState(0)
	const [manualPlayIndex, setManualPlayIndex] = useState<number | null>(null)

	// Once a user manually selects a thumbnail, autoplay is permanently stopped (except for the tapped video).
	// Auto-play/advance is strictly limited to the focused+visible card — non-focused cards never autoplay or auto-advance.
	const autoPlayStoppedRef = useRef(false)
	const canAutoPlay = useMemo(() => autoPlay && isVisible && !autoPlayStoppedRef.current, [autoPlay, isVisible])
	const canAdvance = useMemo(() => canAutoPlay && items.length > 1, [canAutoPlay, items.length])

	// Reset the active index when the media set changes.
	useEffect(() => {
		setActiveIndex(0)
		setManualPlayIndex(null)
		autoPlayStoppedRef.current = false
	}, [media])

	const activeItem = items[activeIndex] ?? null
	const activeIsVideo = useMemo(() => isVideoMedia(activeItem), [activeItem])
	const shouldAutoPlayVideo = useMemo(() => activeIsVideo && (canAutoPlay || (isVisible && manualPlayIndex === activeIndex)), [activeIsVideo, canAutoPlay, isVisible, manualPlayIndex])
	const shouldLoopSingleVideo = useMemo(() => items.length === 1 && activeIsVideo && canAutoPlay, [items.length, activeIsVideo, canAutoPlay])

	// Advance to the next item (wraps around).
	const advanceToNext = useCallback(() => {
		if (autoPlayStoppedRef.current) return
		if (items.length <= 1) return
		setActiveIndex((current) => {
			const next = (current + 1) % items.length
			onIndexChange?.(next)
			return next
		})
	}, [items.length, onIndexChange])

	// Image auto-advance: show for IMAGE_DISPLAY_MS then move on.
	useEffect(() => {
		if (!canAdvance || activeIsVideo) return
		const timer = setTimeout(advanceToNext, IMAGE_DISPLAY_MS)
		return () => clearTimeout(timer)
	}, [canAdvance, activeIsVideo, activeIndex, advanceToNext])

	// Manual thumbnail selection — stops autoplay, but tapped media should still display/play.
	const selectIndex = useCallback(
		(index: number) => {
			const tappedIsVideo = isVideoMedia(items[index])
			if (tappedIsVideo) {
				setManualPlayIndex(index)
			} else {
				setManualPlayIndex(null)
			}
			autoPlayStoppedRef.current = true
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
		<View style={[styles.container, overlayThumbnails && styles.containerOverlay, style, { pointerEvents: overlayThumbnails ? 'box-none' : 'auto' }]} accessibilityLabel={accessibilityLabel}>
			<View style={[styles.preview, overlayThumbnails && styles.previewOverlay, previewStyle, { pointerEvents: manualPlayIndex === activeIndex && activeIsVideo ? 'auto' : 'none' }]}>
				<SmartMediaView
					media={activeItem}
					contentFit={contentFit}
					style={StyleSheet.absoluteFill}
					enableFullscreenPreview={enableFullscreenPreview}
					autoPlay={shouldAutoPlayVideo}
					loop={shouldLoopSingleVideo}
					onPlaybackEnd={isVisible && canAdvance && activeIsVideo ? advanceToNext : undefined}
					controls={manualPlayIndex === activeIndex && activeIsVideo ? true : controls}
					isVisible={isVisible}
				/>
			</View>

			{showThumbnails && items.length > 1 && (
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					style={[styles.strip, overlayThumbnails && styles.stripOverlay, stripStyle]}
					contentContainerStyle={[styles.stripContent, overlayThumbnails && styles.stripContentOverlay, stripContentStyle]}
				>
					{items.map((item, index) => {
						const isActive = index === activeIndex
						const isThumbVideo = isVideoMedia(item)
						return (
							<TouchableOpacity
								key={(item as any)._id || index}
								onPress={() => selectIndex(index)}
								style={[styles.thumbnail, thumbnailStyle, isActive && styles.thumbnailActive, isActive && thumbnailActiveStyle]}
								accessibilityRole="button"
								accessibilityLabel={(item as any).name || (item as any).originalname || `Media ${index + 1}`}
							>
								{isThumbVideo ? (
									<View style={[StyleSheet.absoluteFill, styles.videoThumbPlaceholder]}>
										<Ionicons name="play-circle" size={24} color={themeColors.background} style={styles.videoThumbIcon} />
									</View>
								) : (
									<SmartMediaView media={item} contentFit="cover" style={StyleSheet.absoluteFill} usePlaybackUrl={false} controls={false} isVisible={isVisible} />
								)}
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
	containerOverlay: {
		flex: 1,
		overflow: 'hidden',
		borderRadius: 20
	},
	preview: {
		width: '100%',
		aspectRatio: 1,
		backgroundColor: themeColors.background,
		overflow: 'hidden'
	},
	previewOverlay: {
		flex: 1,
		aspectRatio: undefined,
		width: '100%',
		height: '100%',
		overflow: 'hidden',
		borderRadius: 20
	},
	strip: {
		marginTop: 8
	},
	stripOverlay: {
		position: 'absolute',
		bottom: 8,
		left: 0,
		right: 0,
		marginTop: 0,
		zIndex: 2
	},
	stripContent: {
		gap: 8,
		paddingHorizontal: 2
	},
	stripContentOverlay: {
		justifyContent: 'center',
		paddingHorizontal: 10
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
	},
	videoThumbPlaceholder: {
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: themeColors.background25
	},
	videoThumbIcon: {
		opacity: 0.9
	}
})

export const SmartMediaCarousel = React.memo(SmartMediaCarouselComponent)
export default SmartMediaCarousel
