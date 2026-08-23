/**
 * SmartMediaGalleryCard — an editable gallery card based on BaseCard.
 *
 * - Displays all gallery files (even above MAX_FILE_COUNT).
 * - Upload is disabled once `gallery.length > maxCount` (defaults to MAX_FILE_COUNT).
 * - Upload/remove are only available in 'edit' mode (after the card edit button is pressed).
 * - Handles picking + uploading files itself; reports results via callbacks.
 */

import React, { useCallback, useState } from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle, Alert } from 'react-native'
import { themeColors } from '@/core/theme'
import { log } from '@/core/log'
import { parseError } from '@/core/error/errorHandler'
import { BaseCard, type CardSize } from '@/features/common/cards/BaseCard'
import { IconButton } from '@/features/common/buttons/IconButton'
import Spinner from '@/features/common/Spinner'
import { MAX_FILE_COUNT, type TargetModelName } from './constants'
import { pickMediaFiles, type PickMediaType } from './picker'
import { uploadGallery } from './upload'
import { getMediaUrl, type MediaFile } from './types'
import SmartMediaView from './view'

export interface SmartMediaGalleryCardProps {
	title?: string
	gallery: MediaFile[]
	targetModelName: TargetModelName
	targetModelId: string
	/** Upload is disabled when gallery.length > this value. Defaults to MAX_FILE_COUNT. */
	maxCount?: number
	mediaType?: PickMediaType
	/** BaseCard mode controls the edit/save/cancel header. */
	mode?: 'view' | 'editable' | 'edit'
	size?: CardSize
	style?: StyleProp<ViewStyle>
	/** External loading state (e.g. while saving). */
	loading?: boolean
	/** Internal upload loading state (managed by the card). */
	uploading?: boolean
	onEdit?: () => void
	onSave?: () => void
	onCancel?: () => void
	/** Called with the full gallery after an internal change. */
	onChange?: (gallery: MediaFile[]) => void
	/** Called with the newly uploaded files after a successful upload. */
	onUpload?: (files: MediaFile[]) => void
	/** Called with a file the user wants to remove. When omitted, the card removes it locally. */
	onRemove?: (file: MediaFile) => void
}

const SmartMediaGalleryCardComponent = ({
	title = 'Gallery',
	gallery,
	targetModelName,
	targetModelId,
	maxCount = MAX_FILE_COUNT,
	mediaType = 'image',
	mode = 'view',
	size = 'md',
	style,
	loading = false,
	uploading: externalUploading,
	onEdit,
	onSave,
	onCancel,
	onChange,
	onUpload,
	onRemove
}: SmartMediaGalleryCardProps) => {
	const [internalUploading, setInternalUploading] = useState(false)
	const uploading = externalUploading ?? internalUploading

	const uploadDisabled = uploading || gallery.length > maxCount

	const handleUpload = useCallback(async () => {
		if (uploadDisabled) return
		const remaining = Math.max(0, maxCount - gallery.length)
		const picked = await pickMediaFiles({ mediaType, multiple: true, maxCount: remaining })
		if (picked.length === 0) return

		setInternalUploading(true)
		try {
			const files = await uploadGallery({ targetModelName, targetModelId, files: picked })
			if (files.length > 0) {
				onChange?.([...gallery, ...files])
				onUpload?.(files)
			}
		} catch (error: any) {
			const parsedError = parseError(error)
			// Use the enhanced message from upload.ts if available (e.g. video timeout / Cloudinary 499 with HLS hint)
			const rawMessage = (error as any)?.message || parsedError.message || error.message || 'Failed to upload gallery files'
			const isVideo = picked.some((f) => f.mimeType?.startsWith('video/'))
			const isCloudinaryLimitError = parsedError.statusCode === 499 || rawMessage.toLowerCase().includes('cloudinary') || rawMessage.includes('499')
			const isVideoTimeout = (parsedError.type === 'timeout' || (parsedError.type === 'network' && isVideo) || isCloudinaryLimitError) && isVideo
			const errorMessage = rawMessage
			const canRetry = parsedError.canRetry !== false

			log({
				level: 'error',
				label: 'smart-media',
				message: isVideoTimeout ? 'Gallery upload timeout/Cloudinary limit — likely HLS processing' : 'Gallery upload failed in UI',
				error,
				data: {
					fileCount: picked.length,
					fileNames: picked.map((f) => f.name),
					canRetry,
					isVideoTimeout,
					isCloudinaryLimitError,
					statusCode: (parsedError as any).statusCode
				}
			})

			if (isVideoTimeout || isCloudinaryLimitError) {
				Alert.alert(isCloudinaryLimitError ? 'Media Service Limit' : 'Upload Processing', errorMessage, [
					{ text: 'OK', style: 'cancel' },
					{ text: 'Retry', onPress: () => handleUpload() }
				])
			} else {
				Alert.alert(
					'Upload Failed',
					errorMessage,
					canRetry
						? [
								{ text: 'Cancel', style: 'cancel' },
								{ text: 'Retry', onPress: () => handleUpload() }
							]
						: [{ text: 'OK', style: 'default' }]
				)
			}
		} finally {
			setInternalUploading(false)
		}
	}, [uploadDisabled, maxCount, gallery, mediaType, targetModelName, targetModelId, onChange, onUpload])

	const handleRemove = useCallback(
		(file: MediaFile) => {
			if (onRemove) {
				onRemove(file)
			} else {
				onChange?.(gallery.filter((item) => item._id !== file._id))
			}
		},
		[gallery, onRemove, onChange]
	)

	const header = (
		<View style={styles.header}>
			<Text style={styles.title} numberOfLines={1}>
				{title}
			</Text>
			<Text style={styles.count}>
				{gallery.length}/{maxCount}
			</Text>
		</View>
	)

	const isEditing = mode === 'edit'

	return (
		<BaseCard mode={mode} title={header} size={size} style={style} onEdit={onEdit} onSave={onSave} onCancel={onCancel} loading={loading}>
			<View style={styles.grid}>
				{gallery.map((file) => {
					const url = getMediaUrl(file)
					if (!url) return null
					return (
						<View key={file._id} style={styles.cell}>
							<SmartMediaView media={file} contentFit="cover" style={StyleSheet.absoluteFill} borderRadius={10} />
							{isEditing && <IconButton icon="close" label="Remove media" onPress={() => handleRemove(file)} variant="danger" iconColor={themeColors.buttonText} style={styles.removeButton} />}
						</View>
					)
				})}

				{isEditing && (
					<IconButton icon="camera-outline" label={uploading ? 'Uploading...' : 'Add media'} onPress={handleUpload} disabled={uploadDisabled} loading={uploading} style={styles.addButton} />
				)}
			</View>
			{isEditing && uploadDisabled && !uploading && gallery.length > maxCount && <Text style={styles.limitHint}>Upload is disabled when the gallery exceeds {maxCount} files.</Text>}
			{loading && <Spinner size="small" expand={false} style={styles.savingOverlay} />}
		</BaseCard>
	)
}

const styles = StyleSheet.create({
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8
	},
	title: {
		fontSize: 16,
		fontWeight: '600',
		color: themeColors.text,
		flexShrink: 1
	},
	count: {
		fontSize: 12,
		fontWeight: '600',
		color: themeColors.textSecondary
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10
	},
	cell: {
		width: 72,
		height: 72,
		borderRadius: 12,
		overflow: 'hidden',
		position: 'relative',
		borderWidth: 1,
		borderColor: themeColors.border,
		backgroundColor: themeColors.background
	},
	removeButton: {
		position: 'absolute',
		top: 4,
		right: 4,
		backgroundColor: themeColors.background75,
		borderRadius: 10,
		width: 20,
		height: 20
	},
	addButton: {
		width: 72,
		height: 72,
		borderRadius: 12,
		borderWidth: 2,
		borderStyle: 'dashed',
		borderColor: themeColors.primary,
		backgroundColor: themeColors.surfaceVariant
	},
	limitHint: {
		marginTop: 8,
		fontSize: 11,
		fontWeight: '500',
		color: themeColors.textSecondary
	},
	savingOverlay: {
		marginTop: 8,
		alignSelf: 'center',
		padding: 8
	}
})

export const SmartMediaGalleryCard = React.memo(SmartMediaGalleryCardComponent)
export default SmartMediaGalleryCard
