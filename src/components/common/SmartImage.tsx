import React, { useState, useEffect } from 'react'
import { Image, ImageProps, ImageSourcePropType, View, StyleSheet, ActivityIndicator } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'

/**
 * Entity types that have specific default fallback images
 */
export type ImageEntityType = 'shop' | 'product' | 'default-product'

/**
 * Default images for each entity type
 * These are local assets that will be shown when the remote image URL fails to load
 */
const DEFAULT_IMAGES: Record<ImageEntityType, ImageSourcePropType> = {
	shop: require('../../../assets/images/icon.png'), // Using app icon as shop placeholder
	product: require('../../../assets/default-products/salmon/thumbnail.jpeg'),
	'default-product': require('../../../assets/default-products/salmon/thumbnail.jpeg')
}

/**
 * Fallback icons for each entity type (used when no default image is available)
 */
const ENTITY_FALLBACK_ICONS: Record<ImageEntityType, keyof typeof MaterialIcons.glyphMap> = {
	shop: 'store',
	product: 'inventory',
	'default-product': 'inventory'
}

interface SmartImageProps extends ImageProps {
	/**
	 * Icon to show as fallback when no entityType is specified
	 */
	fallbackIcon?: keyof typeof MaterialIcons.glyphMap
	/**
	 * Container style for the image wrapper
	 */
	containerStyle?: any
	/**
	 * Entity type to determine which default image to show on error
	 * When specified, a default image will be shown instead of just an icon
	 */
	entityType?: ImageEntityType
	/**
	 * Whether to show an icon fallback or a default image fallback
	 * When true, shows icon even if entityType is specified
	 * @default false
	 */
	preferIconFallback?: boolean
	/**
	 * Array of fallback URLs to try in order before showing the local asset
	 * Example: [defaultProduct?.media?.thumbnail?.url]
	 */
	fallbackSources?: (string | undefined | null)[]
}

const SmartImage: React.FC<SmartImageProps> = ({ source, style, fallbackIcon = 'image-not-supported', containerStyle, entityType, preferIconFallback = false, fallbackSources = [], ...props }) => {
	const { colors } = useTheme()
	const [currentSourceIndex, setCurrentSourceIndex] = useState(-1) // -1 means using primary source
	const [error, setError] = useState(false)
	const [loading, setLoading] = useState(false)

	// Filter out empty/null/undefined fallback sources
	const validFallbackSources = fallbackSources.filter((s): s is string => !!s && typeof s === 'string')

	// Extract URI for stable dependency tracking
	const primaryUri = typeof source === 'object' && source && !Array.isArray(source) ? (source as any).uri : null

	// Reset state if primary source URI changes
	useEffect(() => {
		setCurrentSourceIndex(-1)
		setError(false)
		setLoading(false)
	}, [primaryUri])

	const hasPrimarySource = !!source && (typeof source === 'number' || (typeof source === 'object' && !Array.isArray(source) && !!(source as any).uri))

	// Get the current source to display
	const getCurrentSource = (): ImageSourcePropType | null => {
		if (currentSourceIndex === -1) {
			return hasPrimarySource ? source : null
		}
		if (currentSourceIndex < validFallbackSources.length) {
			return { uri: validFallbackSources[currentSourceIndex] }
		}
		return null
	}

	const currentSource = getCurrentSource()
	const hasMoreFallbacks = currentSourceIndex < validFallbackSources.length - 1

	// Handle image load error - try next fallback or show final fallback
	const handleError = () => {
		console.warn('Image failed to load:', currentSource)
		setLoading(false)

		if (hasMoreFallbacks || (currentSourceIndex === -1 && validFallbackSources.length > 0)) {
			// Try next fallback source
			setCurrentSourceIndex((prev) => prev + 1)
		} else {
			// No more fallbacks, show error state
			setError(true)
		}
	}

	// Determine the appropriate fallback icon based on entityType
	const getFallbackIcon = (): keyof typeof MaterialIcons.glyphMap => {
		if (entityType && ENTITY_FALLBACK_ICONS[entityType]) {
			return ENTITY_FALLBACK_ICONS[entityType]
		}
		return fallbackIcon
	}

	// Render icon fallback
	const renderIconFallback = () => {
		const resolvedStyle = StyleSheet.flatten(style || {})
		const iconSize = typeof resolvedStyle.width === 'number' ? resolvedStyle.width / 3 : 32

		return (
			<View style={[styles.placeholder, { backgroundColor: colors.surface }, style, containerStyle]}>
				<MaterialIcons name={getFallbackIcon()} size={iconSize} color={colors.textTertiary} />
			</View>
		)
	}

	// Render default image fallback for entity (used when all URL sources fail)
	const renderImageFallback = () => {
		if (!entityType || !DEFAULT_IMAGES[entityType]) {
			return renderIconFallback()
		}

		return (
			<View style={[styles.container, style, containerStyle]}>
				<Image {...props} source={DEFAULT_IMAGES[entityType]} style={[StyleSheet.absoluteFill, style]} />
			</View>
		)
	}

	// If there's no current source (no primary and no fallbacks, or all exhausted)
	if (!currentSource) {
		if (preferIconFallback || !entityType) {
			return renderIconFallback()
		}
		return renderImageFallback()
	}

	// If there was an error and no more fallbacks, show entity image or icon
	if (error) {
		if (preferIconFallback || !entityType) {
			return renderIconFallback()
		}
		return renderImageFallback()
	}

	return (
		<View style={[styles.container, style, containerStyle]}>
			<Image
				{...props}
				source={currentSource}
				style={[StyleSheet.absoluteFill, style]}
				onLoadStart={() => setLoading(true)}
				onLoad={() => setLoading(false)}
				onLoadEnd={() => setLoading(false)}
				onError={handleError}
			/>
			{loading && (
				<View style={styles.loader}>
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
	placeholder: {
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 8
	},
	loader: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0,0,0,0.05)'
	}
})

export default SmartImage
