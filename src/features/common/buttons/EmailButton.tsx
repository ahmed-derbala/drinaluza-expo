import { useMemo } from 'react'
import { Linking } from 'react-native'
import { IconButton } from './IconButton'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'

export interface EmailButtonProps {
	/** Email address. */
	email?: string | null
	/** Optional accessibility label. Defaults to "Email". */
	label?: string
	/** Optional button size. */
	size?: number
	/** Whether the button is disabled (grayed out). */
	disabled?: boolean
	/** Optional press handler called before opening the email client. */
	onPress?: (e?: any) => void
}

export function EmailButton({ email, label, size, disabled = false, onPress }: EmailButtonProps) {
	const { colors } = useTheme()
	if (!email) return null

	const resolvedIconColor = '#818CF8'
	const resolvedStyle = useMemo(() => ({ backgroundColor: '#818CF81A', borderColor: '#818CF838' }), [])

	const handlePress = (e?: any) => {
		e?.stopPropagation?.()
		onPress?.(e)
		Linking.openURL(`mailto:${email}`).catch(() => {})
	}

	return (
		<IconButton
			icon="mail-outline"
			label={label ?? translate('email', 'Email')}
			onPress={handlePress}
			colors={colors}
			iconColor={disabled ? undefined : resolvedIconColor}
			size={size}
			disabled={disabled}
			style={disabled ? undefined : resolvedStyle}
		/>
	)
}
