import React, { useCallback } from 'react'
import { Platform, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { IconButton, type IconVariant } from './IconButton'

export interface DownloadButtonProps {
	downloadUrl?: string | null
	version?: string | null
	label?: string
	variant?: IconVariant
	disabled?: boolean
	style?: StyleProp<ViewStyle>
	onPress?: () => void
	onAfterDownload?: () => void
}

export function DownloadButton({ downloadUrl, version, label = translate('download', 'Download'), variant = 'primary', disabled, style, onPress, onAfterDownload }: DownloadButtonProps) {
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

	return <IconButton icon="download-outline" label={label} subtitle={version ? `v${version}` : undefined} onPress={handlePress} disabled={isDisabled} variant={variant} colors={colors} style={style} />
}
