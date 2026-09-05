import { useMemo } from 'react'
import { Linking } from 'react-native'
import { IconBaseButton } from '@buttons/IconBaseButton'
import { useTheme } from '@theme'
import { translate } from '@translation'

export interface WebsiteButtonProps {
	/** Website URL. */
	website?: string | null
	/** Optional accessibility label. Defaults to "Website". */
	label?: string
	/** Optional button size. */
	size?: number
	/** Whether the button is disabled (grayed out). */
	disabled?: boolean
	/** Optional press handler called before opening the website. */
	onPress?: (e?: any) => void
}

function normalizeWebsiteUrl(website?: string | null): string | null {
	if (!website) return null
	return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

export function WebsiteButton({ website, label, size, disabled = false, onPress }: WebsiteButtonProps) {
	const { colors } = useTheme()
	const url = normalizeWebsiteUrl(website)
	if (!url) return null

	const resolvedIconColor = colors.primary
	const resolvedStyle = useMemo(() => ({ backgroundColor: `${colors.primary}1A`, borderColor: `${colors.primary}38` }), [colors.primary])

	const handlePress = (e?: any) => {
		e?.stopPropagation?.()
		onPress?.(e)
		Linking.openURL(url).catch(() => {})
	}

	return (
		<IconBaseButton
			icon="globe-outline"
			label={label ?? translate('website', 'Website')}
			onPress={handlePress}
			iconColor={disabled ? undefined : resolvedIconColor}
			size={size}
			disabled={disabled}
			style={disabled ? undefined : resolvedStyle}
		/>
	)
}
