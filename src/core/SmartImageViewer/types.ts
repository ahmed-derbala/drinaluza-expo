import type { StyleProp, ViewStyle } from 'react-native'
import type { ImageStyle, ImageContentFit, ImageSource } from 'expo-image'

/**
 * Entity type hint for the image.
 * Reserved for future entity-specific fallback images or styling.
 */
export type SmartImageEntityType = 'product' | 'business' | 'user' | 'generic'

/**
 * Props for the SmartImage component.
 *
 * Designed to be a drop-in replacement for all image rendering
 * across the app. Supports remote URLs, local assets, loading
 * states, error fallbacks, timeout handling, and caching.
 */
export interface SmartImageProps {
	/** Image URL (remote) or local asset. Falsy values trigger the fallback. */
	source: string | null | undefined

	/** Style applied directly to the expo-image `Image` component. */
	style?: StyleProp<ImageStyle>

	/**
	 * How the image should fit within its container.
	 * Maps to expo-image's `contentFit` prop.
	 * @default 'contain'
	 */
	contentFit?: ImageContentFit

	/**
	 * Legacy alias for `contentFit`.
	 * Provided for backward compatibility with existing usage.
	 * If both `contentFit` and `resizeMode` are set, `contentFit` takes precedence.
	 */
	resizeMode?: 'cover' | 'contain' | 'stretch' | 'center'

	/**
	 * Semantic entity type hint.
	 * Reserved for future entity-specific fallback images or styling.
	 * @default 'generic'
	 */
	entityType?: SmartImageEntityType

	/** Style applied to the outer wrapper View container. */
	containerStyle?: StyleProp<ViewStyle>

	/** Custom placeholder image source (overrides default blurhash). */
	placeholder?: ImageSource

	/** Explicit width (alternative to setting via style). */
	width?: number

	/** Explicit height (alternative to setting via style). */
	height?: number

	/** Convenience border radius prop. */
	borderRadius?: number

	/** Whether the image is accessible. @default true */
	accessible?: boolean

	/** Accessibility label for screen readers. */
	accessibilityLabel?: string

	/** Test ID for automated testing. */
	testID?: string

	/** Enable fullscreen lightbox preview when tapping the image. */
	enableFullscreenPreview?: boolean
}
