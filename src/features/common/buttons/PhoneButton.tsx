import { useMemo } from 'react'
import { Linking } from 'react-native'
import { IconButton } from './IconButton'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'

export type PhoneLike = string | { fullNumber?: string } | null | undefined
export type BackupPhoneLike = { fullNumber?: string } | string

export interface PhoneButtonProps {
	/** Phone number as a string or a Phone object. */
	phone?: PhoneLike
	/** Optional backup phone numbers to use if the primary phone is missing. */
	backupPhones?: Array<BackupPhoneLike> | null | undefined
	/** Optional accessibility label. Defaults to "Call". */
	label?: string
	/** Optional button size. */
	size?: number
	/** Whether the button is disabled (grayed out). */
	disabled?: boolean
	/** Optional press handler called before opening the dialer. */
	onPress?: (e?: any) => void
}

function getPhoneNumber(phone?: PhoneLike | BackupPhoneLike): string | undefined {
	if (!phone) return undefined
	if (typeof phone === 'string') return phone
	return phone.fullNumber
}

function getPrimaryNumber(phone?: PhoneLike, backupPhones?: Array<BackupPhoneLike> | null | undefined): string | undefined {
	const primary = getPhoneNumber(phone)
	if (primary) return primary
	return backupPhones?.map(getPhoneNumber).find(Boolean)
}

export function PhoneButton({ phone, backupPhones, label, size, disabled = false, onPress }: PhoneButtonProps) {
	const { colors } = useTheme()
	const number = getPrimaryNumber(phone, backupPhones)
	if (!number) return null

	const resolvedIconColor = colors.primary
	const resolvedStyle = useMemo(() => ({ backgroundColor: `${colors.primary}1A`, borderColor: `${colors.primary}38` }), [colors.primary])

	const handlePress = (e?: any) => {
		e?.stopPropagation?.()
		onPress?.(e)
		Linking.openURL(`tel:${number}`).catch(() => {})
	}

	return (
		<IconButton
			icon="call"
			label={label ?? translate('call', 'Call')}
			onPress={handlePress}
			iconColor={disabled ? undefined : resolvedIconColor}
			size={size}
			disabled={disabled}
			style={disabled ? undefined : resolvedStyle}
		/>
	)
}
