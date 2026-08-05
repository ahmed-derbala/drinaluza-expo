/**
 * SmartImageViewer constants
 * Centralized fallback image, default transitions, and timeout configuration.
 */

// Fallback image shown when source is missing or fails to load
export const FALLBACK_IMAGE = require('../../../assets/images/no_image.png')

// Smooth crossfade transition duration (ms)
export const DEFAULT_TRANSITION_DURATION = 200

/**
 * A neutral light-gray blurhash used as a shimmer placeholder
 * while the image is loading. This prevents layout shift and
 * provides a polished loading experience.
 *
 * Renders as a soft gray gradient — visually neutral across
 * light and dark themes.
 */
export const DEFAULT_BLURHASH = 'L5H2EC=PM+yV0g-mq.wG9c010J}I'

