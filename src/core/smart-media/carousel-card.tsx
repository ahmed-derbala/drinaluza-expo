import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { BaseCard, type CardSize } from '@/features/common/cards/BaseCard'
import { IconButton } from '@/features/common/buttons/IconButton'
import Spinner from '@/features/common/Spinner'
import { themeColors } from '@/core/theme'
import { log } from '@/core/log'
import { parseError } from '@/core/error/errorHandler'
import { MAX_FILE_COUNT, type TargetModelName } from '@/core/smart-media/constants'
import { pickMediaFiles, type PickMediaType } from '@/core/smart-media/picker'
import { uploadGallery } from '@/core/smart-media/upload'
import { getMediaUrl, getVideoPosterUrl, isVideoMedia, type MediaField, type MediaFile } from '@/core/smart-media/types'
import SmartMediaView from '@/core/smart-media/view'
import { useMediaSettings } from '@/core/media-settings/MediaSettingsContext'

const IMAGE_DISPLAY_MS = 2_000

export interface CarouselCardProps {
	title?: string
	media?: MediaField | null
	targetModelName?: TargetModelName
	targetModelId?: string
	maxCount?: number
	mediaType?: PickMediaType
	mode?: 'view' | 'editable' | 'edit'
	size?: CardSize
	style?: StyleProp<ViewStyle>
	loading?: boolean
	autoPlay?: boolean
	isVisible?: boolean
	contentFit?: 'cover' | 'contain' | 'fill'
	onEdit?: () => void
	onSave?: () => void
	onCancel?: () => void
	onChange?: (gallery: MediaFile[]) => void
	onUpload?: (files: MediaFile[]) => void
	onRemove?: (file: MediaFile) => void
}

const collectItems = (media?: MediaField | null): MediaFile[] => {
	if (!media) return []
	const items: MediaFile[] = []
	const hasValidGallery = Array.isArray(media.gallery) && media.gallery.some((file) => !!getMediaUrl(file as any))
	if (hasValidGallery) {
		for (const file of media.gallery as MediaFile[]) {
			if (getMediaUrl(file)) items.push(file)
		}
	} else if (media.thumbnail && getMediaUrl(media.thumbnail)) {
		items.push(media.thumbnail)
	}
	return items
}

const CarouselCardComponent = ({
	title = 'Media',
	media,
	targetModelName,
	targetModelId,
	maxCount = MAX_FILE_COUNT,
	mediaType = 'mixed' as any,
	mode = 'view',
	size = 'md',
	style,
	loading = false,
	autoPlay = true,
	isVisible = true,
	contentFit = 'cover',
	onEdit,
	onSave,
	onCancel,
	onChange,
	onUpload,
	onRemove
}: CarouselCardProps) => {
	const items = useMemo(() => collectItems(media), [media])
	const [activeIndex, setActiveIndex] = useState(0)
	const [manualPlayIndex, setManualPlayIndex] = useState<number | null>(null)
	const [internalUploading, setInternalUploading] = useState(false)
	const uploading = internalUploading

	const { autoAdvance: settingsAutoAdvance, autoPlay: settingsAutoPlay, soundOn } = useMediaSettings()
	const effectiveAutoPlay = autoPlay && settingsAutoPlay
	const effectiveAutoAdvance = settingsAutoAdvance

	const autoPlayStoppedRef = useRef(false)
	const canAutoPlay = useMemo(() => effectiveAutoPlay && isVisible && !autoPlayStoppedRef.current, [effectiveAutoPlay, isVisible])
	const canAdvance = useMemo(() => canAutoPlay && effectiveAutoAdvance && items.length > 1, [canAutoPlay, effectiveAutoAdvance, items.length])

	useEffect(() => {
		setActiveIndex(0)
		setManualPlayIndex(null)
		autoPlayStoppedRef.current = false
	}, [media])

	const activeItem = items[activeIndex] ?? null
	const activeIsVideo = useMemo(() => isVideoMedia(activeItem), [activeItem])
	const shouldAutoPlayVideo = useMemo(() => activeIsVideo && (canAutoPlay || (isVisible && manualPlayIndex === activeIndex)), [activeIsVideo, canAutoPlay, isVisible, manualPlayIndex])
	const shouldLoopSingleVideo = useMemo(() => items.length === 1 && activeIsVideo && canAutoPlay, [items.length, activeIsVideo, canAutoPlay])

	const advanceToNext = useCallback(() => {
		if (autoPlayStoppedRef.current) return
		if (items.length <= 1) return
		setActiveIndex((current) => (current + 1) % items.length)
	}, [items.length])

	useEffect(() => {
		if (!canAdvance || activeIsVideo) return
		const timer = setTimeout(advanceToNext, IMAGE_DISPLAY_MS)
		return () => clearTimeout(timer)
	}, [canAdvance, activeIsVideo, activeIndex, advanceToNext])

	const selectIndex = useCallback(
		(index: number) => {
			const tappedIsVideo = isVideoMedia(items[index])
			if (tappedIsVideo) {
				setManualPlayIndex(index)
			} else {
				setManualPlayIndex(null)
			}
			autoPlayStoppedRef.current = true
			setActiveIndex(index)
		},
		[items]
	)

	const uploadDisabled = uploading || !targetModelName || !targetModelId || items.length >= maxCount
	const isEditing = mode === 'edit'

	const handleUpload = useCallback(async () => {
		if (uploadDisabled || !targetModelName || !targetModelId) return
		const remaining = Math.max(0, maxCount - items.length)
		const picked = await pickMediaFiles({ mediaType: mediaType as any, multiple: true, maxCount: remaining })
		if (picked.length === 0) return
		setInternalUploading(true)
		try {
			const files = await uploadGallery({ targetModelName, targetModelId, files: picked })
			if (files.length > 0) {
				const next = [...items, ...files]
				onChange?.(next as MediaFile[])
				onUpload?.(files)
			}
		} catch (error: any) {
			const parsedError = parseError(error)
			const rawMessage = (error as any)?.message || parsedError.message || 'Failed to upload'
			const isVideo = picked.some((f) => f.mimeType?.startsWith('video/'))
			const isCloudinaryLimitError = parsedError.statusCode === 499 || rawMessage.toLowerCase().includes('cloudinary') || rawMessage.includes('499')
			const isVideoTimeout = (parsedError.type === 'timeout' || (parsedError.type === 'network' && isVideo) || isCloudinaryLimitError) && isVideo
			log({ level: 'error', label: 'CarouselCard', message: isVideoTimeout ? 'Upload timeout' : 'Upload failed', error, data: { fileCount: picked.length } })
			if (isVideoTimeout || isCloudinaryLimitError) {
				Alert.alert(isCloudinaryLimitError ? 'Media Service Limit' : 'Upload Processing', rawMessage, [
					{ text: 'OK', style: 'cancel' },
					{ text: 'Retry', onPress: () => handleUpload() }
				])
			} else {
				Alert.alert(
					'Upload Failed',
					rawMessage,
					parsedError.canRetry !== false
						? [
								{ text: 'Cancel', style: 'cancel' },
								{ text: 'Retry', onPress: () => handleUpload() }
							]
						: [{ text: 'OK' }]
				)
			}
		} finally {
			setInternalUploading(false)
		}
	}, [uploadDisabled, maxCount, items, mediaType, targetModelName, targetModelId, onChange, onUpload])

	const handleRemove = useCallback(
		(file: MediaFile) => {
			if (onRemove) {
				onRemove(file)
			} else {
				const next = items.filter((it) => it._id !== file._id)
				onChange?.(next)
				if (activeIndex >= next.length) {
					setActiveIndex(Math.max(0, next.length - 1))
				}
			}
		},
		[items, activeIndex, onRemove, onChange]
	)

	const headerCount = (
		<Text style={styles.count}>
			{items.length}/{maxCount}
		</Text>
	)

	return (
		<BaseCard
			mode={mode}
			title={
				<View style={styles.headerTitle}>
					<Text style={styles.title} numberOfLines={1}>
						{title}
					</Text>
					{headerCount}
				</View>
			}
			size={size}
			style={style}
			onEdit={onEdit}
			onSave={onSave}
			onCancel={onCancel}
			loading={loading}
		>
			{/* Preview — tap to fullscreen */}
			<View style={styles.preview}>
				{activeItem ? (
					<SmartMediaView
						media={activeItem}
						contentFit={contentFit}
						style={StyleSheet.absoluteFill}
						enableFullscreenPreview={mode !== 'edit'}
						autoPlay={shouldAutoPlayVideo}
						loop={shouldLoopSingleVideo}
						onPlaybackEnd={isVisible && canAdvance && activeIsVideo ? advanceToNext : undefined}
						controls={manualPlayIndex === activeIndex && activeIsVideo ? true : true}
						isVisible={isVisible}
					/>
				) : (
					<View style={[StyleSheet.absoluteFill, styles.emptyPreview]}>
						<Ionicons name="images-outline" size={32} color={themeColors.textTertiary} />
					</View>
				)}
			</View>

			{/* Thumbs — tap stops auto advance/play, except tapped video still plays */}
			{items.length > 0 && (
				<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.stripContent}>
					{items.map((item, index) => {
						const isActive = index === activeIndex
						const isThumbVideo = isVideoMedia(item)
						return (
							<View key={(item as any)._id || index} style={[styles.thumbWrap, isActive && styles.thumbWrapActive]}>
								<TouchableOpacity
									onPress={() => selectIndex(index)}
									style={[styles.thumbnail, isActive && styles.thumbnailActive]}
									accessibilityRole="button"
									accessibilityLabel={(item as any).name || (item as any).originalname || `Media ${index + 1}`}
									disabled={isEditing && uploading}
								>
									{isThumbVideo ? (
										<View style={[StyleSheet.absoluteFill, styles.videoThumbPlaceholder]}>
											{(() => {
												const poster = getVideoPosterUrl(item as any)
												return poster ? <Image source={poster} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" /> : null
											})()}
											<View style={styles.videoThumbOverlay}>
												<Ionicons name="play-circle" size={24} color={themeColors.buttonText} style={styles.videoThumbIcon} />
											</View>
										</View>
									) : (
										<SmartMediaView media={item} contentFit="cover" style={StyleSheet.absoluteFill} controls={false} isVisible={isVisible} />
									)}
								</TouchableOpacity>
								{isEditing && <IconButton icon="close" label="Remove" onPress={() => handleRemove(item)} variant="danger" iconColor={themeColors.buttonText} size={20} style={styles.removeBadge} />}
							</View>
						)
					})}
					{isEditing && (
						<IconButton icon="camera-outline" label={uploading ? 'Uploading...' : 'Add media'} onPress={handleUpload} disabled={uploadDisabled} loading={uploading} size={56} style={styles.addThumb} />
					)}
				</ScrollView>
			)}
			{isEditing && uploadDisabled && !uploading && items.length >= maxCount && <Text style={styles.limitHint}>Max {maxCount} files reached.</Text>}
			{loading && <Spinner size="small" expand={false} style={styles.savingOverlay} />}
		</BaseCard>
	)
}

const styles = StyleSheet.create({
	headerTitle: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		flexShrink: 1
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
	preview: {
		width: '100%',
		aspectRatio: 1,
		backgroundColor: themeColors.background,
		overflow: 'hidden',
		borderRadius: 12
	},
	emptyPreview: {
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: themeColors.surfaceVariant
	},
	strip: {
		marginTop: 12
	},
	stripContent: {
		gap: 8,
		paddingHorizontal: 2,
		alignItems: 'center'
	},
	thumbWrap: {
		position: 'relative',
		width: 56,
		height: 56
	},
	thumbWrapActive: {},
	thumbnail: {
		width: 56,
		height: 56,
		borderRadius: 10,
		overflow: 'hidden',
		borderWidth: 2,
		borderColor: themeColors.border,
		backgroundColor: themeColors.background
	},
	thumbnailActive: {
		borderColor: themeColors.primary
	},
	videoThumbPlaceholder: {
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: themeColors.background25,
		overflow: 'hidden'
	},
	videoThumbOverlay: {
		...(StyleSheet.absoluteFill as object),
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0,0,0,0.12)'
	},
	videoThumbIcon: {
		opacity: 0.95
	},
	removeBadge: {
		position: 'absolute',
		top: -6,
		right: -6,
		backgroundColor: themeColors.error,
		borderRadius: 10,
		width: 20,
		height: 20
	},
	addThumb: {
		width: 56,
		height: 56,
		borderRadius: 10,
		borderWidth: 2,
		borderStyle: 'dashed',
		borderColor: themeColors.primary,
		backgroundColor: themeColors.surfaceVariant
	},
	limitHint: {
		marginTop: 8,
		fontSize: 11,
		color: themeColors.textSecondary
	},
	savingOverlay: {
		marginTop: 8,
		alignSelf: 'center'
	}
})

export const CarouselCard = React.memo(CarouselCardComponent)
export default CarouselCard
