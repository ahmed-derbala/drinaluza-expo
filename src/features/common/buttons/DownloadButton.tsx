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
	/** Whether a download is currently in progress. Shows a pause icon. */
	isDownloading?: boolean
	/** Whether the download is paused. Shows a resume (play) icon. */
	isPaused?: boolean
	/** Optional style override. */
	style?: StyleProp<ViewStyle>
	/** Optional press override. */
	onPress?: () => void
	/** Optional callback after the download action. */
	onAfterDownload?: () => void
}

export function DownloadButton({
	downloadUrl,
	label = translate('download', 'Download'),
	variant = 'primary',
	size,
	disabled,
	isDownloading,
	isPaused,
	style,
	onPress,
	onAfterDownload
}: DownloadButtonProps) {
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
	const icon = isPaused ? 'play-outline' : isDownloading ? 'pause-outline' : 'download-outline'

	return <IconButton icon={icon} label={label} onPress={handlePress} disabled={isDisabled} variant={variant} outline={isDownloading} size={size} colors={colors} style={style} />
}
