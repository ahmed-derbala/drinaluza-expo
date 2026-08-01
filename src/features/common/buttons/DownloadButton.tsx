import React, { useCallback } from 'react'
import { Platform, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { IconButton, type IconVariant } from './IconButton'

export interface DownloadButtonProps {
	/** Download URL. Required on web unless an explicit onPress is provided. */
	downloadUrl?: string | null
	/** Accessibility label, not displayed as visible text. */
	label?: string
	/** Icon style variant. */
	variant?: IconVariant
	/** Optional button size. */
	size?: number
	/** Whether the button is disabled. */
	disabled?: boolean
	/** Optional style override. */
	style?: StyleProp<ViewStyle>
	/** Optional press override. */
	onPress?: () => void
	/** Optional callback after the download action. */
	onAfterDownload?: () => void
}

export function DownloadButton({ downloadUrl, label = translate('download', 'Download'), variant = 'primary', size, disabled, style, onPress, onAfterDownload }: DownloadButtonProps) {
	const { colors } = useTheme()

	const handlePress = useCallback(() => {
		if (onPress) {
			onPress()
			onAfterDownload?.()
			return
		}

		if (Platform.OS === 'web' && downloadUrl && typeof document !== 'undefined') {
			const link = document.createElement('a')
			link.href = downloadUrl
			link.setAttribute('download', '')
			link.style.display = 'none'
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
		}

		onAfterDownload?.()
	}, [onPress, downloadUrl, onAfterDownload])

	const isDisabled = disabled !== undefined ? disabled : !downloadUrl

	return <IconButton icon="download-outline" label={label} onPress={handlePress} disabled={isDisabled} variant={variant} size={size} colors={colors} style={style} />
}
