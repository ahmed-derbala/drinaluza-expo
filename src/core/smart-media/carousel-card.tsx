import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { BaseCard, type CardSize } from '@cards/BaseCard'
import { IconBaseButton } from '@buttons/IconBaseButton'
import Spinner from '@ui/spinner/Spinner'
import { themeColors } from '@theme'
import { log } from '@log'
import { parseError } from '@error/errorHandler'
import { MAX_FILE_COUNT, type TargetModelName } from '@smart-media/constants'
import { pickMediaFiles, type PickMediaType } from '@smart-media/picker'
import { uploadGallery } from '@smart-media/upload'
import { getMediaUrl, getVideoPosterUrl, isVideoMedia, type MediaField, type MediaFile } from '@smart-media/types'
import SmartMediaView from '@smart-media/view'
import { useMediaSettings } from '@settings/MediaSettingsContext'

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
	previewHeight?: number
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
	const hasValidGallery = Array.isArray(media.gallery) && media.gallery.some((file) => !!getMediaUrl(file as MediaFile))
	if (hasValidGallery) {
		for (const file of media.gallery as MediaFile[]) {
			if (getMediaUrl(file)) items.push(file)
		}
	} else if (media.thumbnail && getMediaUrl(media.thumbnail as MediaFile)) {
		items.push(media.thumbnail as MediaFile)
	}
	return items
}

const VideoThumbPoster = React.memo(({ item, isVisible }: { item: MediaFile; isVisible: boolean }) => {
	const poster = useMemo(() => getVideoPosterUrl(item as any), [item])
	if (poster) {
		return <Image source={poster} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" />
	}
	return null
})
VideoThumbPoster.displayName = 'VideoThumbPoster'

const ThumbItem = React.memo(
	({
		item,
		index,
		isActive,
		isVisible,
		disabled,
		isEditing,
		onSelect,
		onRemove
	}: {
		item: MediaFile
		index: number
		isActive: boolean
		isVisible: boolean
		disabled: boolean
		isEditing: boolean
		onSelect: (index: number) => void
		onRemove: (file: MediaFile) => void
	}) => {
		const isThumbVideo = isVideoMedia(item as any)
		const label = (item as any).name || (item as any).originalname || `Media ${index + 1}`
		return (
			<View style={[styles.thumbWrap, isActive && styles.thumbWrapActive]}>
				<TouchableOpacity onPress={() => onSelect(index)} style={[styles.thumbnail, isActive && styles.thumbnailActive]} accessibilityRole="button" accessibilityLabel={label} disabled={disabled}>
					{isThumbVideo ? (
						<View style={[StyleSheet.absoluteFill, styles.videoThumbPlaceholder]}>
							<VideoThumbPoster item={item} isVisible={isVisible} />
							<View style={styles.videoThumbOverlay}>
								<Ionicons name="play-circle" size={24} color={themeColors.buttonText} style={styles.videoThumbIcon} />
							</View>
						</View>
					) : (
						<SmartMediaView media={item as any} contentFit="cover" style={StyleSheet.absoluteFill} controls={false} isVisible={isVisible} />
					)}
				</TouchableOpacity>
				{isEditing && <IconBaseButton icon="close" label="Remove" onPress={() => onRemove(item)} variant="danger" iconColor={themeColors.buttonText} size={20} style={styles.removeBadge} />}
			</View>
		)
	}
)
ThumbItem.displayName = 'ThumbItem'

const CarouselCardComponent = ({
	title = 'Media',
	media,
	targetModelName,
	targetModelId,
	maxCount = MAX_FILE_COUNT,
	mediaType = 'mixed',
	mode = 'view',
	size = 'md',
	style,
	previewHeight,
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
	const [hasInteracted, setHasInteracted] = useState(false)
	const [internalUploading, setInternalUploading] = useState(false)

	const { autoAdvance: settingsAutoAdvance, autoPlay: settingsAutoPlay } = useMediaSettings()
	const effectiveAutoPlay = autoPlay && settingsAutoPlay
	const effectiveAutoAdvance = settingsAutoAdvance

	const canAutoPlay = useMemo(() => effectiveAutoPlay && isVisible && !hasInteracted, [effectiveAutoPlay, isVisible, hasInteracted])
	const canAdvance = useMemo(() => canAutoPlay && effectiveAutoAdvance && items.length > 1, [canAutoPlay, effectiveAutoAdvance, items.length])

	useEffect(() => {
		setActiveIndex(0)
		setManualPlayIndex(null)
		setHasInteracted(false)
	}, [media])

	useEffect(() => {
		if (activeIndex >= items.length && items.length > 0) {
			setActiveIndex(items.length - 1)
		}
	}, [items.length, activeIndex])

	const activeItem = items[activeIndex] ?? null
	const activeIsVideo = useMemo(() => isVideoMedia(activeItem as any), [activeItem])
	const shouldAutoPlayVideo = useMemo(() => activeIsVideo && (canAutoPlay || (isVisible && manualPlayIndex === activeIndex)), [activeIsVideo, canAutoPlay, isVisible, manualPlayIndex, activeIndex])
	const shouldLoopSingleVideo = useMemo(() => items.length === 1 && activeIsVideo && canAutoPlay, [items.length, activeIsVideo, canAutoPlay])

	const advanceToNext = useCallback(() => {
		if (hasInteracted) return
		if (items.length <= 1) return
		setActiveIndex((current) => (current + 1) % items.length)
	}, [hasInteracted, items.length])

	useEffect(() => {
		if (!canAdvance || activeIsVideo) return
		const timer = setTimeout(advanceToNext, IMAGE_DISPLAY_MS)
		return () => clearTimeout(timer)
	}, [canAdvance, activeIsVideo, activeIndex, advanceToNext])

	const selectIndex = useCallback(
		(index: number) => {
			const tappedIsVideo = isVideoMedia(items[index] as any)
			setManualPlayIndex(tappedIsVideo ? index : null)
			setHasInteracted(true)
			setActiveIndex(index)
		},
		[items]
	)

	const uploadDisabled = useMemo(() => internalUploading || !targetModelName || !targetModelId || items.length >= maxCount, [internalUploading, targetModelName, targetModelId, items.length, maxCount])
	const isEditing = mode === 'edit'

	const handleUpload = useCallback(async () => {
		if (uploadDisabled || !targetModelName || !targetModelId) return
		const remaining = Math.max(0, maxCount - items.length)
		const picked = await pickMediaFiles({ mediaType, multiple: true, maxCount: remaining })
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
				return
			}
			const next = items.filter((it) => it._id !== file._id)
			onChange?.(next)
			if (activeIndex >= next.length) {
				setActiveIndex(Math.max(0, next.length - 1))
			}
		},
		[items, activeIndex, onRemove, onChange]
	)

	const headerCount = useMemo(
		() => (
			<Text style={styles.count}>
				{items.length}/{maxCount}
			</Text>
		),
		[items.length, maxCount]
	)

	const showLimitHint = isEditing && items.length >= maxCount && !internalUploading

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
			<View style={[styles.preview, previewHeight ? ({ height: previewHeight, aspectRatio: undefined } as any) : null]}>
				{activeItem ? (
					<SmartMediaView
						media={activeItem as any}
						contentFit={contentFit}
						enableFullscreenPreview={mode !== 'edit'}
						autoPlay={shouldAutoPlayVideo}
						loop={shouldLoopSingleVideo}
						onPlaybackEnd={isVisible && canAdvance && activeIsVideo ? advanceToNext : undefined}
						controls
						isVisible={isVisible}
					/>
				) : (
					<View style={[StyleSheet.absoluteFill, styles.emptyPreview]}>
						<Ionicons name="images-outline" size={32} color={themeColors.textTertiary} />
					</View>
				)}
			</View>

			{items.length > 0 && (
				<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.stripContent}>
					{items.map((item, index) => (
						<ThumbItem
							key={(item as any)._id || `idx-${index}`}
							item={item}
							index={index}
							isActive={index === activeIndex}
							isVisible={isVisible}
							disabled={isEditing && internalUploading}
							isEditing={isEditing}
							onSelect={selectIndex}
							onRemove={handleRemove}
						/>
					))}
					{isEditing && (
						<IconBaseButton
							icon="camera-outline"
							label={internalUploading ? 'Uploading...' : 'Add media'}
							onPress={handleUpload}
							disabled={uploadDisabled}
							loading={internalUploading}
							size={56}
							style={styles.addThumb}
						/>
					)}
				</ScrollView>
			)}
			{showLimitHint && <Text style={styles.limitHint}>Max {maxCount} files reached.</Text>}
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
		aspectRatio: 1,
		position: 'relative',
		borderRadius: 12,
		overflow: 'hidden',
		backgroundColor: themeColors.background
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
		...StyleSheet.absoluteFill,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0,0,0,0.12)'
	} as any,
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
