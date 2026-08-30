import { useCallback } from 'react'
import { type StyleProp, type ViewStyle } from 'react-native'
import { useRouter, type Href } from 'expo-router'
import { translate } from '@/core/translation'
import { IconButton, type IconVariant } from './IconButton'

export interface UpdatesButtonProps {
	/** Optional accessibility label. Defaults to "Updates". */
	label?: string
	/** Optional target route. Defaults to "/updates". */
	href?: Href
	/** When true, uses `router.replace` instead of `router.navigate`. */
	replace?: boolean
	/** Optional press override. When provided, navigation is skipped. */
	onPress?: () => void
	/** Optional button size. */
	size?: number
	/** Whether the button is disabled. */
	disabled?: boolean
	/** Whether the button is in a loading state. */
	loading?: boolean
	/** Icon style variant. */
	variant?: IconVariant
	/** Optional outline style. */
	outline?: boolean
	/** Optional style override. */
	style?: StyleProp<ViewStyle>
	/** Optional icon color override. */
	iconColor?: string
}

export function UpdatesButton({
	label = translate('updates', 'Updates'),
	href = '/updates' as Href,
	replace = false,
	onPress,
	size,
	disabled = false,
	loading = false,
	variant = 'secondary',
	outline,
	style,
	iconColor
}: UpdatesButtonProps) {
	const router = useRouter()

	const handlePress = useCallback(() => {
		if (onPress) {
			onPress()
			return
		}

		if (replace) {
			router.replace(href)
		} else {
			router.navigate(href)
		}
	}, [onPress, href, replace, router])

	return (
		<IconButton icon="download-outline" label={label} onPress={handlePress} disabled={disabled} loading={loading} variant={variant} outline={outline} iconColor={iconColor} size={size} style={style} />
	)
}
