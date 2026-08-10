import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native'
import { Image, type ImageContentFit } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { themeColors } from '@/core/theme'
import { config } from '@/config'
import { IconButton } from '@/features/common/buttons/IconButton'
import Spinner from '@/features/common/Spinner'
import type { SmartImageProps } from './types'

// Fallback image shown when source is missing or fails to load
const FALLBACK_IMAGE = require('../../../assets/images/no_image.png')

/**
 * Maps legacy `resizeMode` values to expo-image's `contentFit`.
 * Defaults to 'contain' when nothing is specified.
 */
function resolveContentFit(contentFit?: ImageContentFit, resizeMode?: SmartImageProps['resizeMode']): ImageContentFit {
	if (contentFit) return contentFit

	if (resizeMode) {
		const map: Record<string, ImageContentFit> = {
			cover: 'cover',
			contain: 'contain',
			stretch: 'fill',
			center: 'none'
		}
		return map[resizeMode] || 'contain'
	}

	return 'contain'
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
 * - Spinner overlay while loading
 * - Automatic fallback to no_image.png on error or missing URL
 * - Configurable timeout from EXPO_PUBLIC_TIMEOUT_MS
 * - React.memo for safe usage in FlashList
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
	width,
	height,
	borderRadius,
	accessible = true,
	accessibilityLabel,
	testID,
	enableFullscreenPreview = false
}: SmartImageProps) {
	const [hasError, setHasError] = useState(false)
	const [isLoaded, setIsLoaded] = useState(false)
	const [isPreviewOpen, setIsPreviewOpen] = useState(false)
	const insets = useSafeAreaInsets()
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const isMountedRef = useRef(true)

	// Determine if we should show fallback immediately
	const sourceIsValid = isValidSource(source)
	const showFallback = !sourceIsValid || hasError

	// Resolve content fit from contentFit or legacy resizeMode
	const resolvedContentFit = useMemo(() => resolveContentFit(contentFit, resizeMode), [contentFit, resizeMode])

	// Strip backgroundColor from style prop to ensure no background color is used
	const cleanedStyle = useMemo(() => {
		if (!style) return undefined
		const flattened = StyleSheet.flatten(style)
		if (flattened && 'backgroundColor' in flattened) {
			const { backgroundColor: _, ...rest } = flattened as any
			return rest
		}
		return flattened
	}, [style])

	// Strip backgroundColor from containerStyle prop
	const cleanedContainerStyle = useMemo(() => {
		if (!containerStyle) return undefined
		const flattened = StyleSheet.flatten(containerStyle)
		if (flattened && 'backgroundColor' in flattened) {
			const { backgroundColor: _, ...rest } = flattened as any
			return rest
		}
		return flattened
	}, [containerStyle])

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

		const timeoutMs = config.api.timeout
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

	// Use recyclingKey for safe FlashList recycling
	const recyclingKey = showFallback ? 'fallback' : source

	const imageElement = (
		<>
			{!showFallback && !isLoaded && <Spinner size="small" expand={false} style={styles.loadingOverlay} />}
			<Image
				source={imageSource}
				style={[styles.image, cleanedStyle, dimensionStyle]}
				contentFit={showFallback ? 'contain' : resolvedContentFit}
				placeholder={undefined}
				cachePolicy="disk"
				recyclingKey={recyclingKey}
				onLoad={showFallback ? undefined : handleLoad}
				onError={showFallback ? undefined : handleError}
				accessible={accessible}
				accessibilityLabel={accessibilityLabel}
				testID={testID}
			/>
		</>
	)

	const handlePress = useCallback(() => {
		if (sourceIsValid && !showFallback) {
			setIsPreviewOpen(true)
		}
	}, [sourceIsValid, showFallback])

	const renderedElement = cleanedContainerStyle ? <View style={cleanedContainerStyle}>{imageElement}</View> : imageElement

	if (enableFullscreenPreview && sourceIsValid && !showFallback) {
		return (
			<>
				<TouchableOpacity onPress={handlePress} style={[styles.image, cleanedStyle, dimensionStyle]}>
					{renderedElement}
				</TouchableOpacity>

				<Modal visible={isPreviewOpen} animationType="fade" onRequestClose={() => setIsPreviewOpen(false)}>
					<View style={styles.modalBackdrop}>
						<TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setIsPreviewOpen(false)} />

						<IconButton
							icon="close"
							label="Close"
							onPress={() => setIsPreviewOpen(false)}
							iconColor={themeColors.buttonText}
							style={{ position: 'absolute', top: insets.top + 16, right: 20, backgroundColor: themeColors.buttonText10, borderColor: 'transparent' }}
						/>

						<View style={styles.fullscreenImageWrapper}>
							<Image source={source} style={styles.fullscreenImage} contentFit="contain" cachePolicy="disk" />
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
	closeModalButton: {
		position: 'absolute',
		right: 20,
		zIndex: 10,
		padding: 8,
		borderRadius: 20,
		backgroundColor: themeColors.buttonText10
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

/**
 * Memoized SmartImageViewer component.
 *
 * Safe for use in FlashList, product grids, chat messages,
 * thumbnails, and fullscreen previews. Prevents unnecessary rerenders
 * when parent components update unrelated state.
 */
const SmartImageViewer = React.memo(SmartImageComponent)

export default SmartImageViewer
export { SmartImageViewer as SmartImage }
export type { SmartImageProps, SmartImageEntityType } from './types'
