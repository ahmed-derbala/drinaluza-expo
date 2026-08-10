import { useMemo } from 'react'
import { IconButton } from './IconButton'
import { themeColors } from '@/core/theme'
import { hasDirectionsTarget, openDirections, type LocationLike, type AddressLike } from '@/core/helpers/maps'
import { translate } from '@/core/translation'

export interface DirectionsButtonProps {
	/** GPS location. */
	location?: LocationLike
	/** Structured address fallback when GPS coordinates are unavailable. */
	address?: AddressLike
	/** Optional accessibility label. Defaults to "Open Directions". */
	label?: string
	/** Optional button size. */
	size?: number
	/** Whether the button is disabled (grayed out). */
	disabled?: boolean
	/** Optional press handler called before opening directions. */
	onPress?: (e?: any) => void
}

export function DirectionsButton({ location, address, label, size, disabled = false, onPress }: DirectionsButtonProps) {
	if (!hasDirectionsTarget(location, address)) return null

	const resolvedIconColor = themeColors.warning
	const resolvedStyle = useMemo(() => ({ backgroundColor: themeColors.warning10, borderColor: themeColors.warning10 }), [])

	const handlePress = (e?: any) => {
		e?.stopPropagation?.()
		onPress?.(e)
		openDirections(location, address)
	}

	return (
		<IconButton
			icon="navigate-outline"
			label={label ?? translate('open_directions', 'Open Directions')}
			onPress={handlePress}
			iconColor={disabled ? undefined : resolvedIconColor}
			size={size}
			disabled={disabled}
			style={disabled ? undefined : resolvedStyle}
		/>
	)
}
