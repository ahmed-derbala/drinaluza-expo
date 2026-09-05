import { useMemo } from 'react'
import { Linking } from 'react-native'
import { IconBaseButton } from '@buttons/IconBaseButton'
import { themeColors } from '@theme'
import { translate } from '@translation'

export interface WhatsAppButtonProps {
	/** WhatsApp number as a string. */
	whatsapp?: string | null
	/** Optional accessibility label. Defaults to "WhatsApp". */
	label?: string
	/** Optional button size. */
	size?: number
	/** Whether the button is disabled (grayed out). */
	disabled?: boolean
	/** Optional press handler called before opening WhatsApp. */
	onPress?: (e?: any) => void
}

function cleanWhatsAppNumber(value: string): string {
	return value.replace(/[^\d+]/g, '')
}

export function WhatsAppButton({ whatsapp, label, size, disabled = false, onPress }: WhatsAppButtonProps) {
	if (!whatsapp) return null

	const resolvedIconColor = themeColors.whatsApp
	const resolvedStyle = useMemo(() => ({ backgroundColor: themeColors.whatsApp10, borderColor: themeColors.whatsApp10 }), [])

	const number = cleanWhatsAppNumber(whatsapp)
	if (!number) return null

	const handlePress = async (e?: any) => {
		e?.stopPropagation?.()
		onPress?.(e)
		const webUrl = `https://wa.me/${number}`
		const appUrl = `whatsapp://send?phone=${number}`
		try {
			const canOpenWeb = await Linking.canOpenURL(webUrl)
			if (canOpenWeb) {
				await Linking.openURL(webUrl)
			} else {
				await Linking.openURL(appUrl)
			}
		} catch {
			await Linking.openURL(appUrl)
		}
	}

	return (
		<IconBaseButton
			icon="logo-whatsapp"
			label={label ?? translate('whatsapp', 'WhatsApp')}
			onPress={handlePress}
			iconColor={disabled ? undefined : resolvedIconColor}
			size={size}
			disabled={disabled}
			style={disabled ? undefined : resolvedStyle}
		/>
	)
}
