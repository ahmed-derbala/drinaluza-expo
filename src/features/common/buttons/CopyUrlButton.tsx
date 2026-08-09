import React, { useCallback, useEffect, useRef, useState } from 'react'
import { type StyleProp, type ViewStyle } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { translate } from '@/core/translation'
import { IconButton } from './IconButton'

export interface CopyUrlButtonProps {
	/** URL to copy to the clipboard. */
	url?: string | null
	/** Accessibility label in idle state. */
	label?: string
	/** Accessibility label after a successful copy. */
	copiedLabel?: string
	/** Whether the button is disabled. */
	disabled?: boolean
	/** Optional button size. */
	size?: number
	/** Optional callback invoked after a successful copy. */
	onAfterCopy?: () => void
	/** Optional style override. */
	style?: StyleProp<ViewStyle>
}

export function CopyUrlButton({ url, label = translate('copy_url', 'Copy Link'), copiedLabel = translate('copied', 'Copied'), disabled, onAfterCopy, size, style }: CopyUrlButtonProps) {
	const [copied, setCopied] = useState(false)
	const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		return () => {
			if (copiedTimeoutRef.current) {
				clearTimeout(copiedTimeoutRef.current)
			}
		}
	}, [])

	const handlePress = useCallback(async () => {
		if (!url) return
		if (copiedTimeoutRef.current) {
			clearTimeout(copiedTimeoutRef.current)
		}
		try {
			await Clipboard.setStringAsync(url)
			setCopied(true)
			onAfterCopy?.()
			copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
		} catch (err) {
			console.warn('[CopyUrlButton] Failed to copy URL:', err)
		}
	}, [url, onAfterCopy])

	const isDisabled = disabled !== undefined ? disabled : !url

	return (
		<IconButton
			icon={copied ? 'checkmark-circle-outline' : 'link-outline'}
			label={copied ? copiedLabel : label}
			onPress={handlePress}
			disabled={isDisabled}
			variant={copied ? 'success' : 'secondary'}
			size={size}
			style={style}
		/>
	)
}
