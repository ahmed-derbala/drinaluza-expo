import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import SmartImage from '@/core/SmartImageViewer'
import { IconButton } from '@/features/common/buttons/IconButton'
import { CancelButton } from '@/features/common/buttons/CancelButton'
import { FileRef } from '@/features/products/products.type'

export interface ProductGallerySectionProps {
	editable: boolean
	gallery: FileRef[]
	colors: any
	translate: (key: string, defaultValue?: string) => string
	// For editable mode (create / edit)
	onUploadPress?: () => void
	onRemovePress?: (item: FileRef) => void
	uploading?: boolean
	// For read-only detail mode
	activeImage?: string | null
	onThumbnailPress?: (url: string) => void
	// Edit triggers
	onEditPress?: () => void
	onSavePress?: () => void
	onCancelPress?: () => void
}

export default function ProductGallerySection({
	editable,
	gallery,
	colors,
	translate,
	onUploadPress,
	onRemovePress,
	uploading = false,
	activeImage,
	onThumbnailPress,
	onEditPress,
	onSavePress,
	onCancelPress
}: ProductGallerySectionProps) {
	const styles = createStyles(colors)

	if (editable) {
		return (
			<View style={styles.fieldContainer}>
				<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
					<Text style={[styles.fieldLabel, { marginBottom: 0 }]}>
						{translate('gallery', 'Gallery')} <Text style={styles.optional}>({translate('optional', 'Optional')})</Text>
						<Text style={{ fontSize: 12, fontWeight: 'normal', color: colors.textSecondary }}> ({gallery.length}/5)</Text>
					</Text>
					<View style={{ flexDirection: 'row', gap: 12 }}>
						{onCancelPress && <CancelButton onPress={onCancelPress} style={{ padding: 4 }} />}
						{onSavePress && <IconButton icon="checkmark-circle" label={translate('save', 'Save')} onPress={onSavePress} variant="success" colors={colors} style={{ padding: 4 }} />}
					</View>
				</View>
				<View style={styles.galleryWrapper}>
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
						{gallery.map((item, idx) => (
							<View key={item._id || idx} style={styles.galleryItem}>
								<SmartImage source={item.url} style={styles.galleryImage} resizeMode="cover" entityType="product" />
								{onRemovePress && (
									<IconButton icon="close" label={translate('remove', 'Remove')} onPress={() => onRemovePress(item)} variant="danger" iconColor="#ffffff" colors={colors} style={styles.removeBadge} />
								)}
							</View>
						))}
						{gallery.length < 5 && onUploadPress && (
							<IconButton
								icon="camera-outline"
								label={translate('add_photo', 'Add Photo')}
								onPress={onUploadPress}
								disabled={uploading}
								loading={uploading}
								colors={colors}
								style={styles.addPhotoBtn}
							/>
						)}
					</ScrollView>
				</View>
			</View>
		)
	}

	// Read-only thumbnail slider for detail page
	if (activeImage !== undefined) {
		if (!gallery || gallery.length <= 1) return null
		return (
			<View style={styles.galleryScrollContainer}>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
					{gallery.map((item, index) => {
						const isSelected = activeImage === item.url
						return (
							<TouchableOpacity
								key={item._id || index}
								onPress={() => onThumbnailPress && onThumbnailPress(item.url)}
								style={[styles.thumbnailContainer, { borderColor: isSelected ? colors.primary : colors.border }]}
								activeOpacity={0.8}
							>
								<SmartImage source={item.url} style={styles.thumbnailImage} resizeMode="cover" entityType="product" />
							</TouchableOpacity>
						)
					})}
				</ScrollView>
			</View>
		)
	}

	// Read-only static preview list for edit screen
	return (
		<View style={styles.fieldContainer}>
			<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
				<Text style={[styles.fieldLabel, { marginBottom: 0 }]}>{translate('gallery', 'Gallery')}</Text>
				{onEditPress && <IconButton icon="create-outline" label={translate('edit', 'Edit')} onPress={onEditPress} colors={colors} style={{ padding: 4 }} />}
			</View>
			<View style={styles.galleryWrapper}>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
					{gallery.map((item, idx) => (
						<View key={item._id || idx} style={styles.galleryItem}>
							<SmartImage source={item.url} style={styles.galleryImage} resizeMode="cover" entityType="product" />
						</View>
					))}
					{gallery.length === 0 && <Text style={{ color: colors.textTertiary, fontStyle: 'italic', paddingVertical: 10 }}>{translate('no_images', 'No images in gallery')}</Text>}
				</ScrollView>
			</View>
		</View>
	)
}

const createStyles = (colors: any) =>
	StyleSheet.create({
		fieldContainer: {
			marginBottom: 16
		},
		fieldLabel: {
			fontSize: 14,
			fontWeight: '700',
			color: colors.text,
			marginBottom: 8
		},
		optional: {
			fontWeight: '400',
			color: colors.textTertiary,
			fontSize: 12
		},
		galleryWrapper: {
			marginTop: 4,
			minHeight: 80
		},
		galleryScroll: {
			flexDirection: 'row',
			gap: 12,
			alignItems: 'center'
		},
		galleryItem: {
			width: 72,
			height: 72,
			borderRadius: 12,
			overflow: 'hidden',
			position: 'relative',
			borderWidth: 1.5,
			borderColor: colors.border
		},
		galleryImage: {
			width: '100%',
			height: '100%'
		},
		removeBadge: {
			position: 'absolute',
			top: 4,
			right: 4,
			backgroundColor: 'rgba(0,0,0,0.6)',
			borderRadius: 10,
			width: 20,
			height: 20,
			justifyContent: 'center',
			alignItems: 'center',
			zIndex: 10
		},
		addPhotoBtn: {
			width: 72,
			height: 72,
			borderRadius: 12,
			borderWidth: 2,
			borderStyle: 'dashed',
			borderColor: colors.primary,
			backgroundColor: colors.surfaceVariant,
			justifyContent: 'center',
			alignItems: 'center',
			gap: 4
		},
		// Detail mode specific styles
		galleryScrollContainer: {
			marginTop: 12,
			height: 72
		},
		galleryRow: {
			flexDirection: 'row',
			gap: 12,
			paddingHorizontal: 16,
			alignItems: 'center'
		},
		thumbnailContainer: {
			width: 72,
			height: 72,
			borderRadius: 12,
			overflow: 'hidden',
			borderWidth: 2
		},
		thumbnailImage: {
			width: '100%',
			height: '100%'
		}
	})
