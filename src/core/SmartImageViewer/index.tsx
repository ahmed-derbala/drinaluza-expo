import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import { Image, type ImageContentFit } from 'expo-image'
import { FALLBACK_IMAGE, DEFAULT_TRANSITION_DURATION, DEFAULT_BLURHASH, getTimeoutMs } from './constants'
import type { SmartImageProps } from './types'

/**
 * Maps legacy `resizeMode` values to expo-image's `contentFit`.
 */
function resolveContentFit(contentFit?: ImageContentFit, resizeMode?: SmartImageProps['resizeMode']): ImageContentFit {
	if (contentFit) return contentFit
	if (!resizeMode) return 'cover'

	switch (resizeMode) {
		case 'cover':
			return 'cover'
		case 'contain':
			return 'contain'
		case 'stretch':
			return 'fill'
		case 'center':
			return 'none'
		default:
			return 'cover'
	}
}

/**
 * Checks whether a source value is a valid, non-empty image URL.
 */
function isValidSource(source: string | null | undefined): source is string {
	return typeof source === 'string' && source.trim().length > 0
}

/**
 * SmartImage — Unified, optimized image component for the entire app.
 *
 * Features:
 * - Uses expo-image for native caching (disk + memory) and web compatibility
 * - Smooth blurhash placeholder while loading (no layout shift)
 * - Automatic fallback to no_image.png on error or missing URL
 * - Configurable timeout from EXPO_PUBLIC_TIMEOUT_MS
 * - React.memo for safe usage in FlatList/FlashList
 * - Backward-compatible resizeMode → contentFit mapping
 *
 * @example
 * ```tsx
 * <SmartImage
 *   source={product.media.thumbnail.url}
 *   width={120}
 *   height={120}
 *   contentFit="cover"
 * />
 * ```
 */
function SmartImageComponent({
	source,
	style,
	contentFit,
	resizeMode,
	entityType: _entityType = 'generic',
	containerStyle,
	placeholder,
	width,
	height,
	borderRadius,
	accessible = true,
	accessibilityLabel,
	testID
}: SmartImageProps) {
	const [hasError, setHasError] = useState(false)
	const [isLoaded, setIsLoaded] = useState(false)
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const isMountedRef = useRef(true)

	// Determine if we should show fallback immediately
	const sourceIsValid = isValidSource(source)
	const showFallback = !sourceIsValid || hasError

	// Resolve content fit from contentFit or legacy resizeMode
	const resolvedContentFit = useMemo(() => resolveContentFit(contentFit, resizeMode), [contentFit, resizeMode])

	// Build dimension overrides from explicit width/height/borderRadius props
	const dimensionStyle = useMemo(() => {
		const s: Record<string, number> = {}
		if (width !== undefined) s.width = width
		if (height !== undefined) s.height = height
		if (borderRadius !== undefined) s.borderRadius = borderRadius
		return Object.keys(s).length > 0 ? s : undefined
	}, [width, height, borderRadius])

	// Reset error state when source changes
	useEffect(() => {
		setHasError(false)
		setIsLoaded(false)
	}, [source])

	// Timeout handling: trigger fallback if image doesn't load in time
	useEffect(() => {
		// Only set timeout for valid remote sources that haven't loaded yet
		if (!sourceIsValid || isLoaded || hasError) return

		const timeoutMs = getTimeoutMs()
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
	}, [source, sourceIsValid, isLoaded, hasError])

	// Cleanup on unmount
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
			// Clear timeout since image loaded successfully
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
				timeoutRef.current = null
			}
		}
	}, [])

	const handleError = useCallback(() => {
		if (isMountedRef.current) {
			setHasError(true)
			// Clear timeout since we've already errored
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
				timeoutRef.current = null
			}
		}
	}, [])

	// Determine the image source to render
	const imageSource = showFallback ? FALLBACK_IMAGE : source

	// Use recyclingKey for safe FlashList/FlatList recycling
	const recyclingKey = showFallback ? 'fallback' : source

	const imageElement = (
		<Image
			source={imageSource}
			style={[styles.image, style, dimensionStyle]}
			contentFit={showFallback ? 'contain' : resolvedContentFit}
			placeholder={showFallback ? undefined : placeholder || { blurhash: DEFAULT_BLURHASH }}
			transition={showFallback ? undefined : { duration: DEFAULT_TRANSITION_DURATION }}
			cachePolicy="disk"
			recyclingKey={recyclingKey}
			onLoad={showFallback ? undefined : handleLoad}
			onError={showFallback ? undefined : handleError}
			accessible={accessible}
			accessibilityLabel={accessibilityLabel}
			testID={testID}
		/>
	)

	// Wrap in container View if containerStyle is provided
	if (containerStyle) {
		return <View style={containerStyle}>{imageElement}</View>
	}

	return imageElement
}

const styles = StyleSheet.create({
	image: {
		// Base styles — consumers override via style prop
		width: '100%',
		height: '100%'
	}
})

/**
 * Memoized SmartImage component.
 *
 * Safe for use in FlatList, FlashList, product grids, chat messages,
 * thumbnails, and fullscreen previews. Prevents unnecessary rerenders
 * when parent components update unrelated state.
 */
const SmartImage = React.memo(SmartImageComponent)

export default SmartImage
export type { SmartImageProps, SmartImageEntityType } from './types'
