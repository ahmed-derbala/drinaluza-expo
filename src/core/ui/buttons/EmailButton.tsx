import { useMemo } from 'react'
import { Linking } from 'react-native'
import { IconBaseButton } from '@/core/ui/buttons/IconBaseButton'
import { themeColors } from '@/core/theme'
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
	if (!email) return null

	const resolvedIconColor = themeColors.email
	const resolvedStyle = useMemo(() => ({ backgroundColor: themeColors.email10, borderColor: themeColors.email10 }), [])

	const handlePress = (e?: any) => {
		e?.stopPropagation?.()
		onPress?.(e)
		Linking.openURL(`mailto:${email}`).catch(() => {})
	}

	return (
		<IconBaseButton
			icon="mail-outline"
			label={label ?? translate('email', 'Email')}
			onPress={handlePress}
			iconColor={disabled ? undefined : resolvedIconColor}
			size={size}
			disabled={disabled}
			style={disabled ? undefined : resolvedStyle}
		/>
	)
}
