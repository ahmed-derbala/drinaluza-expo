import React from 'react'
import { Image, ImageContentFit } from 'expo-image'
import { View, StyleSheet } from 'react-native'

/**
 * Entity types that have specific default fallback images
 */
type ImageEntityType = 'user' | 'business' | 'product'

/**
 * Default images for each entity type.
 * Image filenames use no hyphens to prevent Metro from generating problematic asset names during Android builds.
 */
const DEFAULT_IMAGES: Record<ImageEntityType, any> = {
	user: require('../../../assets/images/defaultuser.png'),
	business: require('../../../assets/images/defaultshop.png'),
	product: require('../../../assets/images/defaultproduct.png')
}

interface SmartImageProps {
	/**
	 * The image URL to display. Can be undefined or null.
	 */
	source?: string | { uri?: string | null } | null
	/**
	 * Container style for the image wrapper
	 */
	containerStyle?: any
	/**
	 * Image style
	 */
	style?: any
	/**
	 * Entity type to determine which default image to show on error. Required.
	 */
	entityType: ImageEntityType
	/**
	 * How the image should be resized to fit. Defaults to 'cover'.
	 */
	contentFit?: ImageContentFit
	/**
	 * @deprecated Use contentFit instead. Kept for backward compatibility.
	 */
	resizeMode?: string
	/**
	 * Accessibility label
	 */
	accessibilityLabel?: string
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
 * SmartImage — Optimized image component powered by expo-image.
 *
 * Features:
 * - Automatic memory + disk caching via expo-image
 * - Smooth 200ms fade-in transitions
 * - Graceful fallback to entity-specific default images on error or missing URL
 * - Optimized across iOS, Android, and Web
 *
 * Performance Note: expo-image manages its own loading states, caching, and error
 * recovery internally — no manual state management needed. The `placeholder` prop
 * is shown while loading and automatically on error, eliminating all the previous
 * ref-based forceUpdate pattern.
 */
const SmartImage: React.FC<SmartImageProps> = ({ source, style, containerStyle, entityType, contentFit = 'cover', resizeMode, accessibilityLabel }) => {
	const uri = extractUri(source)
	const hasValidUri = !!uri && uri.trim().length > 0

	// Map legacy resizeMode to contentFit if provided
	const resolvedContentFit: ImageContentFit = (resizeMode as ImageContentFit) || contentFit

	return (
		<View style={[styles.container, containerStyle]}>
			<Image
				source={hasValidUri ? { uri } : DEFAULT_IMAGES[entityType]}
				placeholder={DEFAULT_IMAGES[entityType]}
				contentFit={resolvedContentFit}
				transition={200}
				style={[styles.image, style]}
				accessibilityLabel={accessibilityLabel}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		overflow: 'hidden'
	},
	image: {
		width: '100%',
		height: '100%'
	}
})

export default SmartImage
