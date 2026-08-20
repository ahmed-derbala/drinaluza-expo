/**
 * SmartMediaThumbnailBlock — displays a media thumbnail with an upload button.
 *
 * Supports:
 * - upload a file (picked from the device)
 * - copy the current file URL
 * - type/edit a URL in a text input
 * - paste a URL from the clipboard (into the input, applied when valid)
 * - remove the current file
 */

import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { themeColors } from '@/core/theme'
import { log } from '@/core/log'
import { IconButton } from '@/features/common/buttons/IconButton'
import Spinner from '@/features/common/Spinner'
import { type TargetModelName } from './constants'
import { pickSingleMediaFile, type PickMediaType } from './picker'
import { uploadThumbnail, type UploadMediaFile } from './upload'
import { deleteMediaFile } from './delete'
import { getMediaUrl, type MediaFile } from './types'
import SmartMediaView from './view'

/** A locally-picked thumbnail reported in deferUpload mode (uploaded later by the caller). */
export interface DeferredMediaFile extends MediaFile {
	pickedFile: UploadMediaFile
}

export const isDeferredMediaFile = (file: MediaFile | null | undefined): file is DeferredMediaFile => Boolean(file && 'pickedFile' in file)

export interface SmartMediaThumbnailBlockProps {
	/** The current thumbnail file, or null when none is set. */
	thumbnail?: MediaFile | null
	/** Required when uploading directly. Ignored in deferUpload mode. */
	targetModelName: TargetModelName
	/** Required when uploading directly. Ignored in deferUpload mode. */
	targetModelId?: string
	mediaType?: PickMediaType
	/** Called with the new thumbnail after upload/paste/remove. */
	onChange?: (thumbnail: MediaFile | null) => void
	/** Called with a file after it was deleted from the backend. */
	onDeleted?: (file: MediaFile) => void
	disabled?: boolean
	/** External loading state. */
	loading?: boolean
	/**
	 * When true, picked files are NOT uploaded to the backend.
	 * The picked file is reported via onChange as a DeferredMediaFile
	 * (caller uploads it once the target model exists, e.g. after creation).
	 * Removing a file never touches the backend in this mode.
	 */
	deferUpload?: boolean
	style?: StyleProp<ViewStyle>
	/** Image/video content fit. Defaults to 'cover'. */
	contentFit?: 'cover' | 'contain' | 'fill'
	/** Open fullscreen preview when the thumbnail is tapped. Defaults to false. */
	enableFullscreenPreview?: boolean
}

const isValidUrl = (value: string): boolean => {
	const trimmed = value.trim()
	if (!trimmed) return false
	try {
		const url = new URL(trimmed)
		return url.protocol === 'http:' || url.protocol === 'https:'
	} catch {
		return /^https?:\/\/.+\..+/.test(trimmed)
	}
}

const SmartMediaThumbnailBlockComponent = ({
	thumbnail,
	targetModelName,
	targetModelId,
	mediaType = 'image',
	onChange,
	onDeleted,
	disabled = false,
	loading: externalLoading,
	deferUpload = false,
	style,
	contentFit = 'cover',
	enableFullscreenPreview = false
}: SmartMediaThumbnailBlockProps) => {
	const [internalLoading, setInternalLoading] = useState(false)
	const [copied, setCopied] = useState(false)
	const [draftUrl, setDraftUrl] = useState<string>('')
	const loading = externalLoading ?? internalLoading

	const url = getMediaUrl(thumbnail)

	// Keep the editable input in sync with the current thumbnail URL.
	useEffect(() => {
		setDraftUrl(url ?? '')
	}, [url])

	const canApplyUrl = isValidUrl(draftUrl) && draftUrl.trim() !== (url ?? '')

	const applyUrl = useCallback(
		(value: string) => {
			const trimmed = value.trim()
			if (!isValidUrl(trimmed)) return
			onChange?.({ _id: `url-${Date.now()}`, url: trimmed })
		},
		[onChange]
	)

	const handleUpload = useCallback(async () => {
		if (disabled || loading) return
		const picked = await pickSingleMediaFile({ mediaType, multiple: false })
		if (!picked) return

		if (deferUpload) {
			onChange?.({
				_id: `pending-${Date.now()}`,
				url: picked.uri,
				name: picked.name,
				mimetype: picked.mimeType,
				size: picked.size,
				pickedFile: picked
			} as DeferredMediaFile)
			return
		}

		setInternalLoading(true)
		try {
			if (!targetModelId) {
				log({ level: 'error', label: 'smart-media', message: 'uploadThumbnail requires a targetModelId (or deferUpload)' })
				return
			}
			const file = await uploadThumbnail({ targetModelName, targetModelId, file: picked })
			onChange?.(file)
		} finally {
			setInternalLoading(false)
		}
	}, [disabled, loading, deferUpload, mediaType, targetModelName, targetModelId, onChange])

	const handleCopy = useCallback(async () => {
		if (!url) return
		try {
			await Clipboard.setStringAsync(url)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch {
			// clipboard unavailable
		}
	}, [url])

	const handlePaste = useCallback(async () => {
		if (disabled || loading) return
		try {
			const text = await Clipboard.getStringAsync()
			const value = (text ?? '').trim()
			setDraftUrl(value)
			if (isValidUrl(value)) {
				applyUrl(value)
			}
		} catch {
			// clipboard unavailable
		}
	}, [disabled, loading, applyUrl])

	const handleRemove = useCallback(async () => {
		if (disabled || loading) return
		const current = thumbnail
		setInternalLoading(true)
		try {
			if (current?._id && !deferUpload) {
				await deleteMediaFile(current._id)
				onDeleted?.(current)
			}
			onChange?.(null)
		} finally {
			setInternalLoading(false)
		}
	}, [disabled, loading, deferUpload, thumbnail, onChange, onDeleted])

	return (
		<View style={[styles.container, style]}>
			<View style={styles.media}>
				<SmartMediaView media={thumbnail} contentFit={contentFit} style={StyleSheet.absoluteFill} enableFullscreenPreview={enableFullscreenPreview} accessibilityLabel="Media thumbnail" />
				{loading && (
					<View style={styles.loadingOverlay} pointerEvents="none">
						<Spinner size="small" expand={false} />
					</View>
				)}
			</View>

			<View style={styles.actions}>
				<IconButton icon="cloud-upload-outline" label="Upload file" onPress={handleUpload} disabled={disabled || loading} loading={loading} style={styles.actionButton} />
				<IconButton icon={copied ? 'checkmark-circle-outline' : 'link-outline'} label={copied ? 'Copied' : 'Copy URL'} onPress={handleCopy} disabled={!url || disabled} style={styles.actionButton} />
				<IconButton icon="clipboard-outline" label="Paste URL" onPress={handlePaste} disabled={disabled || loading} style={styles.actionButton} />
				<IconButton icon="trash-outline" label="Remove" onPress={handleRemove} disabled={!thumbnail || disabled || loading} variant="danger" style={styles.actionButton} />
			</View>

			<View style={styles.urlInputRow}>
				<TextInput
					style={[styles.urlInput, { color: themeColors.text }]}
					value={draftUrl}
					onChangeText={setDraftUrl}
					placeholder="https://example.com/photo.jpg"
					placeholderTextColor={themeColors.textTertiary}
					autoCapitalize="none"
					autoCorrect={false}
					keyboardType="url"
					editable={!disabled && !loading}
					accessibilityLabel="Media URL"
				/>
				<IconButton icon="checkmark" label="Set URL" onPress={() => applyUrl(draftUrl)} disabled={!canApplyUrl || disabled || loading} style={styles.urlApplyButton} />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		gap: 10
	},
	media: {
		width: '100%',
		aspectRatio: 1,
		borderRadius: 16,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: themeColors.border,
		backgroundColor: themeColors.background,
		position: 'relative'
	},
	loadingOverlay: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: themeColors.background50
	},
	actions: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8
	},
	actionButton: {
		flexGrow: 1,
		flexBasis: '45%'
	},
	urlInputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		borderWidth: 1,
		borderColor: themeColors.border,
		borderRadius: 10,
		backgroundColor: themeColors.background,
		overflow: 'hidden'
	},
	urlInput: {
		flex: 1,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 13,
		minWidth: 0
	},
	urlApplyButton: {
		flexShrink: 0
	}
})

export const SmartMediaThumbnailBlock = React.memo(SmartMediaThumbnailBlockComponent)
export default SmartMediaThumbnailBlock
