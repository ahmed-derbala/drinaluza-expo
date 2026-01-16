import React, { useState, useRef, useCallback } from 'react'
import { Image, ImageProps, ImageSourcePropType, View, StyleSheet, ActivityIndicator } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'

/**
 * Entity types that have specific default fallback images
 */
export type ImageEntityType = 'user' | 'shop' | 'product' | 'default-product'

/**
 * Default images for each entity type
 * These are local assets that will be shown when the remote image URL fails to load
 */
const DEFAULT_IMAGES: Record<ImageEntityType, ImageSourcePropType> = {
	user: require('../../../assets/images/default-user.png'),
	shop: require('../../../assets/images/default-shop.png'),
	product: require('../../../assets/images/default-product.png'),
	'default-product': require('../../../assets/images/default-default-product.png')
}

interface SmartImageProps extends Omit<ImageProps, 'source'> {
	/**
	 * The image URL to display. Can be undefined or null.
	 * Accepts a string URL or an object with { uri: string }
	 */
	source?: string | { uri?: string | null } | null
	/**
	 * Container style for the image wrapper
	 */
	containerStyle?: any
	/**
	 * Entity type to determine which default image to show on error
	 * Required - determines the fallback image
	 */
	entityType: ImageEntityType
}

// Helper to extract URI from source prop
const extractUri = (source: SmartImageProps['source']): string | null => {
	if (!source) return null
	if (typeof source === 'string') return source || null
	if (typeof source === 'object' && 'uri' in source) {
		return source.uri || null
	}
	return null
}

/**
 * SmartImage - An optimized image component for loading remote images
 *
 * Features:
 * - Shows a blue loading indicator while the image is loading
 * - Handles undefined/null/empty URLs gracefully
 * - Shows appropriate default image based on entity type when:
 *   - URL is undefined/null/empty
 *   - URL returns 404 or error
 *   - URL returns non-image content
 * - Optimized for all platforms (iOS, Android, Web)
 */
const SmartImage: React.FC<SmartImageProps> = ({ source, style, containerStyle, entityType, resizeMode = 'cover', ...props }) => {
	const { colors } = useTheme()

	// Extract URI once - this is a simple synchronous operation
	const uri = extractUri(source)
	const hasValidUri = uri && uri.trim().length > 0

	// Use refs to track state without causing re-renders
	const loadingRef = useRef(false)
	const errorRef = useRef(false)
	const currentUriRef = useRef<string | null>(null)

	// Force update mechanism
	const [, forceUpdate] = useState(0)

	// Reset state if URI changed
	if (currentUriRef.current !== uri) {
		currentUriRef.current = uri
		loadingRef.current = false
		errorRef.current = false
	}

	// Handle image load error
	const handleError = useCallback(() => {
		if (!errorRef.current) {
			loadingRef.current = false
			errorRef.current = true
			forceUpdate((n) => n + 1)
		}
	}, [])

	// Handle image load start
	const handleLoadStart = useCallback(() => {
		if (!loadingRef.current && !errorRef.current) {
			loadingRef.current = true
			forceUpdate((n) => n + 1)
		}
	}, [])

	// Handle image load end
	const handleLoadEnd = useCallback(() => {
		if (loadingRef.current) {
			loadingRef.current = false
			forceUpdate((n) => n + 1)
		}
	}, [])

	// Flatten style to get dimensions for container
	const flatStyle = StyleSheet.flatten(style || {})

	// If no valid URI or error occurred, show default image
	if (!hasValidUri || errorRef.current) {
		return (
			<View style={[styles.container, flatStyle, containerStyle]}>
				<Image {...props} source={DEFAULT_IMAGES[entityType]} style={[styles.image, style]} resizeMode={resizeMode} />
			</View>
		)
	}

	return (
		<View style={[styles.container, flatStyle, containerStyle]}>
			<Image {...props} source={{ uri }} style={[styles.image, style]} resizeMode={resizeMode} onLoadStart={handleLoadStart} onLoadEnd={handleLoadEnd} onError={handleError} />
			{loadingRef.current && (
				<View style={[styles.loaderContainer, { backgroundColor: colors.surface }]}>
					<ActivityIndicator size="small" color={colors.primary} />
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		position: 'relative',
		overflow: 'hidden'
	},
	image: {
		width: '100%',
		height: '100%'
	},
	loaderContainer: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
		alignItems: 'center'
	}
})

export default SmartImage
