import { useMemo } from 'react'
import { IconButton } from './IconButton'
import { useTheme } from '@/core/theme'
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
	const { colors } = useTheme()
	if (!hasDirectionsTarget(location, address)) return null

	const resolvedIconColor = '#F59E0B'
	const resolvedStyle = useMemo(() => ({ backgroundColor: '#F59E0B1A', borderColor: '#F59E0B38' }), [])

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
			colors={colors}
			iconColor={disabled ? undefined : resolvedIconColor}
			size={size}
			disabled={disabled}
			style={disabled ? undefined : resolvedStyle}
		/>
	)
}
