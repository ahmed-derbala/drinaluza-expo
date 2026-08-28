/**
 * SmartMediaView — unified image/video viewer.
 *
 * - Displays images with expo-image and videos with expo-video.
 * - Shows a Spinner while the media is loading.
 * - Shows `assets/images/no_media.png` when there is no file or it fails to load.
 * - Caches file metadata via `core/cache` and expo-image's native caching.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native'
import { Image, type ImageContentFit } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { themeColors } from '@/core/theme'
import { IconButton } from '@/features/common/buttons/IconButton'
import Spinner from '@/features/common/Spinner'
import { cacheMediaFile } from './cache'
import { getMediaType, getMediaUrl, getVideoPosterUrl, getVideoUrl, type MediaSource, type SmartMediaStyleProps } from './types'
import { SmartVideoPlayer } from './video'
import { getCachedVideoUri, prefetchVideoToCache } from './video-cache'

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
	/** Whether to show video controls (native + custom). Defaults to true. When false, no controls are rendered. */
	controls?: boolean
	/** Called when video playback ends (videos only). */
	onPlaybackEnd?: () => void
	/** When true, video will use playback_url (HLS) if available. Defaults to true. */
	usePlaybackUrl?: boolean
	/** When false, video will not be mounted (shows poster) to save memory/battery for off-screen cards. */
	isVisible?: boolean
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
	nativeControls = true,
	controls = true,
	onPlaybackEnd,
	usePlaybackUrl = true,
	isVisible = true
}: SmartMediaViewProps) => {
	const [hasError, setHasError] = useState(false)
	const [isLoaded, setIsLoaded] = useState(false)
	const [isPreviewOpen, setIsPreviewOpen] = useState(false)
	const insets = useSafeAreaInsets()
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const isMountedRef = useRef(true)

	const mediaType = useMemo(() => getMediaType(media), [media])
	const isVideo = mediaType === 'video'
	const [useFallbackForVideo, setUseFallbackForVideo] = useState(false)
	const [cachedVideoUri, setCachedVideoUri] = useState<string | null>(null)
	const [isCacheChecked, setIsCacheChecked] = useState(false)
	const [hasVideoStarted, setHasVideoStarted] = useState(false)

	// Cache media ID to avoid expensive string operations
	const mediaId = useMemo(() => (typeof media === 'object' && media?._id ? media._id : null), [media])

	// Check for locally cached MP4 first — like UPDATES_FOLDER for APKs, VIDEOS_FOLDER for videos
	// Only check when visible to avoid FileSystem thrash for off-screen cards
	useEffect(() => {
		if (!isVisible || !isVideo || !mediaId) {
			if (!isVideo) setIsCacheChecked(true)
			// For video when not visible, keep previous cached value but mark checked to avoid spinner
			if (!isVisible && isVideo) setIsCacheChecked(true)
			return
		}
		let cancelled = false
		setIsCacheChecked(false)
		;(async () => {
			const cached = await getCachedVideoUri(media as any)
			if (!cancelled) {
				setCachedVideoUri(cached)
				setIsCacheChecked(true)
			}
		})()
		return () => {
			cancelled = true
		}
	}, [mediaId, isVideo, isVisible])

	// Prefetch the MP4 in background for next offline play (secure_url → VIDEOS_FOLDER) — only when visible
	useEffect(() => {
		if (!isVisible || !isVideo || !mediaId || cachedVideoUri) return
		const file: any = media
		if (file.secure_url || file.url) {
			prefetchVideoToCache(file)
		}
	}, [mediaId, isVideo, isVisible, cachedVideoUri, media])

	const url = useMemo(() => {
		if (cachedVideoUri) return cachedVideoUri
		if (!isVideo) return getMediaUrl(media)
		// On web, HLS (.m3u8) is not natively supported in Chrome/Firefox — use MP4 directly
		if (Platform.OS === 'web') return getMediaUrl(media)
		if (!usePlaybackUrl) return getMediaUrl(media)
		if (useFallbackForVideo) return getMediaUrl(media)
		return getVideoUrl(media)
	}, [media, isVideo, usePlaybackUrl, useFallbackForVideo, cachedVideoUri])
	const sourceIsValid = Boolean(url)
	const isCheckingCache = isVideo && !isCacheChecked

	useEffect(() => {
		setUseFallbackForVideo(false)
		setCachedVideoUri(null)
		setIsCacheChecked(false)
		setHasVideoStarted(false)
	}, [media])

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

	// Track if video has ever started (for first-frame poster and last-frame retention)
	const handleVideoPlayingChange = useCallback((isPlaying: boolean) => {
		if (isPlaying) setHasVideoStarted(true)
	}, [])

	const handleVideoError = useCallback(() => {
		if (!isVideo) return
		// If HLS fails, try cached MP4 first, then fallback to mp4 remote
		if (cachedVideoUri) return // already using cached, no further fallback
		if (usePlaybackUrl && !useFallbackForVideo) {
			const hasPlayback = typeof media === 'object' && media !== null && (media as any).playback_url
			if (hasPlayback) {
				setUseFallbackForVideo(true)
				return
			}
		}
		// If still failing and we have a cached file not yet tried, try it
		if (typeof media === 'object' && media?._id) {
			;(async () => {
				const cached = await getCachedVideoUri(media as any)
				if (cached) setCachedVideoUri(cached)
			})()
		}
	}, [isVideo, usePlaybackUrl, useFallbackForVideo, media, cachedVideoUri])

	const handlePress = useCallback(() => {
		if (sourceIsValid && !showFallback && !isVideo) {
			setIsPreviewOpen(true)
		}
	}, [sourceIsValid, showFallback, isVideo])

	// On web, HLS may need poster; on native, show first frame via poster until video starts, and keep last frame when paused (don't unmount)
	// Must be before any early return to keep hook order stable
	const videoPosterUrl = useMemo(() => (isVideo ? getVideoPosterUrl(media) : null), [media, isVideo])
	const showVideoPoster = isVideo && !hasVideoStarted && !hasError && !!videoPosterUrl

	if (isCheckingCache) {
		return (
			<View style={[styles.image, cleanedStyle, dimensionStyle]}>
				<Spinner size="small" expand={false} style={styles.loadingOverlay} />
			</View>
		)
	}

	// Keep player mounted for all valid videos (even off-screen, paused) to
	// avoid mount/unmount churn on scroll which triggers Android
	// TextureVideoView shared-object race ("Cannot use shared object...").
	// Visibility/focus only toggles autoPlay (play/pause) via stable player.
	const shouldMountVideo = isVideo && sourceIsValid && !hasError

	const imageElement = isVideo ? (
		<View style={[styles.image, dimensionStyle]}>
			{showVideoPoster && <Image source={videoPosterUrl} style={[StyleSheet.absoluteFill, styles.image]} contentFit="cover" cachePolicy="disk" />}
			{shouldMountVideo ? (
				<SmartVideoPlayer
					source={url as string}
					style={StyleSheet.absoluteFill}
					contentFit={resolvedContentFit as any}
					autoPlay={autoPlay}
					loop={loop}
					nativeControls={controls ? nativeControls : false}
					controls={controls}
					accessibilityLabel={accessibilityLabel}
					testID={testID}
					onPlaybackEnd={onPlaybackEnd}
					onError={handleVideoError}
					onPlayingChange={setHasVideoStarted}
				/>
			) : videoPosterUrl ? (
				<Image source={videoPosterUrl} style={[StyleSheet.absoluteFill, styles.image]} contentFit="cover" cachePolicy="disk" />
			) : null}
		</View>
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
