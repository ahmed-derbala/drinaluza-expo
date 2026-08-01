import React, { useCallback } from 'react'
import { Platform, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { TextButton } from './TextButton'
import type { ButtonVariant } from './BaseButton'

export interface DownloadUpdateButtonProps {
	/** Download URL. Required on web unless an explicit onPress is provided. */
	downloadUrl?: string | null
	/** Version to display next to the icon. */
	version?: string | null
	/** Whether the download is currently paused. */
	isPaused?: boolean
	/** Whether a download is currently in progress. */
	isDownloading?: boolean
	/** Optional accessibility label. Falls back to the current action. */
	label?: string
	/** Visual variant. */
	variant?: ButtonVariant
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

export function DownloadUpdateButton({
	downloadUrl,
	version,
	isPaused = false,
	isDownloading = false,
	label,
	variant = 'primary',
	size,
	disabled,
	style,
	onPress,
	onAfterDownload
}: DownloadUpdateButtonProps) {
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

	const isPause = isDownloading && !isPaused
	const icon = isPaused ? 'play-outline' : isPause ? 'pause-outline' : 'cloud-download-outline'
	const actionLabel = isPaused ? translate('resume', 'Resume') : isPause ? translate('pause', 'Pause') : translate('download', 'Download')
	const text = version ? `v${version}` : ''
	const isDisabled = disabled !== undefined ? disabled : !downloadUrl && !onPress
	const pauseStyle: StyleProp<ViewStyle> | undefined = isPause ? { backgroundColor: 'transparent', borderColor: colors.warning } : undefined

	return (
		<TextButton
			icon={icon}
			text={text}
			label={label ?? actionLabel}
			onPress={handlePress}
			disabled={isDisabled}
			variant={isPause ? 'secondary' : variant}
			iconColor={isPause ? colors.warning : undefined}
			size={size}
			colors={colors}
			style={style ? [style, pauseStyle] : pauseStyle}
		/>
	)
}
