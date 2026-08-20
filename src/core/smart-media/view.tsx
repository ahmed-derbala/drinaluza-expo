/**
 * SmartMediaView — unified image/video viewer.
 *
 * - Displays images with expo-image and videos with expo-video.
 * - Shows a Spinner while the media is loading.
 * - Shows `assets/images/no_media.png` when there is no file or it fails to load.
 * - Caches file metadata via `core/cache` and expo-image's native caching.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native'
import { Image, type ImageContentFit } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { themeColors } from '@/core/theme'
import { IconButton } from '@/features/common/buttons/IconButton'
import Spinner from '@/features/common/Spinner'
import { cacheMediaFile } from './cache'
import { getMediaType, getMediaUrl, type MediaSource, type SmartMediaStyleProps } from './types'
import { SmartVideoPlayer } from './video'

const FALLBACK_IMAGE = require('../../../assets/images/no_media.png')

const RESIZE_MODE_TO_CONTENT_FIT: Record<string, ImageContentFit> = {
	cover: 'cover',
	contain: 'contain',
	stretch: 'fill',
	center: 'none'
}

const resolveContentFit = (contentFit?: ImageContentFit, resizeMode?: SmartMediaViewProps['resizeMode']): ImageContentFit => {
	if (contentFit) return contentFit
	if (resizeMode) return RESIZE_MODE_TO_CONTENT_FIT[resizeMode] || 'contain'
	return 'contain'
}

export interface SmartMediaViewProps extends SmartMediaStyleProps {
	/** A media URL, a full media file, or nothing (shows the fallback). */
	media: MediaSource
	accessible?: boolean
	accessibilityLabel?: string
	testID?: string
	/** Open a fullscreen image preview when tapped (images only). Defaults to false. */
	enableFullscreenPreview?: boolean
	/** Start video playback automatically. Defaults to false. */
	autoPlay?: boolean
	/** Loop videos. Defaults to false. */
	loop?: boolean
	/** Use native video controls. Defaults to true. */
	nativeControls?: boolean
}

const SmartMediaViewComponent = ({
	media,
	style,
	containerStyle,
	contentFit,
	resizeMode,
	width,
	height,
	borderRadius,
	accessible = true,
	accessibilityLabel,
	testID,
	enableFullscreenPreview = false,
	autoPlay = false,
	loop = false,
	nativeControls = true
}: SmartMediaViewProps) => {
	const [hasError, setHasError] = useState(false)
	const [isLoaded, setIsLoaded] = useState(false)
	const [isPreviewOpen, setIsPreviewOpen] = useState(false)
	const insets = useSafeAreaInsets()
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const isMountedRef = useRef(true)

	const url = getMediaUrl(media)
	const mediaType = useMemo(() => getMediaType(media), [media])
	const isVideo = mediaType === 'video'
	const sourceIsValid = Boolean(url)

	// Strip backgroundColor so the media surface never paints over its container.
	const cleanedStyle = useMemo(() => {
		if (!style) return undefined
		const flattened = StyleSheet.flatten(style) as Record<string, unknown> | null
		if (flattened && 'backgroundColor' in flattened) {
			const { backgroundColor: _removed, ...rest } = flattened
			return rest
		}
		return flattened
	}, [style])

	const cleanedContainerStyle = useMemo(() => {
		if (!containerStyle) return undefined
		const flattened = StyleSheet.flatten(containerStyle) as Record<string, unknown> | null
		if (flattened && 'backgroundColor' in flattened) {
			const { backgroundColor: _removed, ...rest } = flattened
			return rest
		}
		return flattened
	}, [containerStyle])

	const dimensionStyle = useMemo(() => {
		const s: Record<string, number> = {}
		if (width !== undefined) s.width = width
		if (height !== undefined) s.height = height
		if (borderRadius !== undefined) s.borderRadius = borderRadius
		return Object.keys(s).length > 0 ? s : undefined
	}, [width, height, borderRadius])

	const resolvedContentFit = useMemo(() => resolveContentFit(contentFit, resizeMode), [contentFit, resizeMode])

	// Cache file metadata for offline / repeat access.
	useEffect(() => {
		if (typeof media === 'object' && media?._id) {
			cacheMediaFile(media)
		}
	}, [media])

	useEffect(() => {
		setHasError(false)
		setIsLoaded(false)
	}, [url])

	// Timeout handling for remote images that never load.
	useEffect(() => {
		if (isVideo || !sourceIsValid || isLoaded || hasError) return
		const timeoutMs = 30000
		timeoutRef.current = setTimeout(() => {
			if (isMountedRef.current && !isLoaded) {
				setHasError(true)
			}
		}, timeoutMs)
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
				timeoutRef.current = null
			}
		}
	}, [isVideo, sourceIsValid, isLoaded, hasError])

	useEffect(() => {
		isMountedRef.current = true
		return () => {
			isMountedRef.current = false
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
				timeoutRef.current = null
			}
		}
	}, [])

	const handleLoad = useCallback(() => {
		if (isMountedRef.current) {
			setIsLoaded(true)
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
				timeoutRef.current = null
			}
		}
	}, [])

	const handleError = useCallback(() => {
		if (isMountedRef.current) {
			setHasError(true)
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
				timeoutRef.current = null
			}
		}
	}, [])

	const showFallback = !sourceIsValid || hasError

	const imageElement = isVideo ? (
		<SmartVideoPlayer
			source={url as string}
			style={dimensionStyle as any}
			contentFit={resolvedContentFit as any}
			autoPlay={autoPlay}
			loop={loop}
			nativeControls={nativeControls}
			accessibilityLabel={accessibilityLabel}
			testID={testID}
		/>
	) : (
		<>
			{!showFallback && !isLoaded && <Spinner size="small" expand={false} style={styles.loadingOverlay} />}
			<Image
				source={showFallback ? FALLBACK_IMAGE : url}
				style={[styles.image, cleanedStyle, dimensionStyle]}
				contentFit={showFallback ? 'contain' : resolvedContentFit}
				cachePolicy="disk"
				recyclingKey={showFallback ? 'fallback' : (url ?? 'fallback')}
				onLoad={showFallback ? undefined : handleLoad}
				onError={showFallback ? undefined : handleError}
				accessible={accessible}
				accessibilityLabel={accessibilityLabel}
				testID={testID}
			/>
		</>
	)

	const renderedElement = cleanedContainerStyle ? <View style={cleanedContainerStyle}>{imageElement}</View> : imageElement

	const handlePress = useCallback(() => {
		if (sourceIsValid && !showFallback && !isVideo) {
			setIsPreviewOpen(true)
		}
	}, [sourceIsValid, showFallback, isVideo])

	if (enableFullscreenPreview && sourceIsValid && !showFallback && !isVideo) {
		return (
			<>
				<TouchableOpacity onPress={handlePress} style={[styles.image, cleanedStyle, dimensionStyle]} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
					{renderedElement}
				</TouchableOpacity>

				<Modal visible={isPreviewOpen} animationType="fade" onRequestClose={() => setIsPreviewOpen(false)}>
					<View style={styles.modalBackdrop}>
						<TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setIsPreviewOpen(false)} />
						<IconButton
							icon="close"
							label="Close preview"
							onPress={() => setIsPreviewOpen(false)}
							iconColor={themeColors.buttonText}
							style={{ position: 'absolute', top: insets.top + 16, right: 20, backgroundColor: themeColors.buttonText10, borderColor: 'transparent' }}
						/>
						<View style={styles.fullscreenImageWrapper}>
							<Image source={url} style={styles.fullscreenImage} contentFit="contain" cachePolicy="disk" />
						</View>
					</View>
				</Modal>
			</>
		)
	}

	return renderedElement
}

const styles = StyleSheet.create({
	image: {
		width: '100%',
		height: '100%'
	},
	loadingOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		padding: 0,
		zIndex: 1
	},
	modalBackdrop: {
		flex: 1,
		backgroundColor: themeColors.background95,
		justifyContent: 'center',
		alignItems: 'center'
	},
	fullscreenImageWrapper: {
		width: '90%',
		height: '70%',
		justifyContent: 'center',
		alignItems: 'center'
	},
	fullscreenImage: {
		width: '100%',
		height: '100%'
	}
})

const SmartMediaView = React.memo(SmartMediaViewComponent)

export default SmartMediaView
export { SmartMediaView }
