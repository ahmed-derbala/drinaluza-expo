import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import SmartImage from '@/core/SmartImageViewer'
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
}

export default function ProductGallerySection({ editable, gallery, colors, translate, onUploadPress, onRemovePress, uploading = false, activeImage, onThumbnailPress }: ProductGallerySectionProps) {
	const styles = createStyles(colors)

	if (editable) {
		return (
			<View style={styles.fieldContainer}>
				<Text style={styles.fieldLabel}>
					{translate('product_gallery', 'Product Gallery')} <Text style={styles.optional}>({translate('optional', 'Optional')})</Text>
					<Text style={{ fontSize: 12, fontWeight: 'normal', color: colors.textSecondary }}> ({gallery.length}/5)</Text>
				</Text>
				<View style={styles.galleryWrapper}>
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
						{gallery.map((item, idx) => (
							<View key={item._id || idx} style={styles.galleryItem}>
								<SmartImage source={item.url} style={styles.galleryImage} resizeMode="cover" entityType="product" />
								{onRemovePress && (
									<TouchableOpacity style={styles.removeBadge} onPress={() => onRemovePress(item)}>
										<Ionicons name="close" size={14} color="#ffffff" />
									</TouchableOpacity>
								)}
							</View>
						))}
						{gallery.length < 5 && onUploadPress && (
							<TouchableOpacity style={styles.addPhotoBtn} onPress={onUploadPress} disabled={uploading}>
								{uploading ? (
									<ActivityIndicator size="small" color={colors.primary} />
								) : (
									<>
										<Ionicons name="camera-outline" size={24} color={colors.primary} />
										<Text style={styles.addPhotoText}>{translate('add_photo', 'Add Photo')}</Text>
									</>
								)}
							</TouchableOpacity>
						)}
					</ScrollView>
				</View>
			</View>
		)
	}

	// Read-only thumbnail slider for detail page
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
		addPhotoText: {
			fontSize: 10,
			fontWeight: '700',
			color: colors.primary
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
