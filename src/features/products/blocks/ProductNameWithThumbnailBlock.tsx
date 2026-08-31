import { View, Text, StyleSheet, Pressable, type StyleProp, type ViewStyle, type TextStyle } from 'react-native'
import { SmartMediaView } from '@/core/smart-media'
import { MaterialIcons } from '@expo/vector-icons'
import { themeColors } from '@/core/theme'

export interface ProductNameWithThumbnailBlockProps {
	/** Product name (localized string) */
	name: string
	/** Optional product thumbnail image URL */
	imageUrl?: string
	/** Press handler to open product details */
	onPress?: () => void
	/** Size of the thumbnail (default: 36) */
	thumbnailSize?: number
	/** Optional container style override */
	style?: StyleProp<ViewStyle>
	/** Optional text style override */
	textStyle?: StyleProp<TextStyle>
	/** Number of lines for text (default: 2) */
	numberOfLines?: number
}

export function ProductNameWithThumbnailBlock({ name, imageUrl, onPress, thumbnailSize = 32, style, textStyle, numberOfLines = 2 }: ProductNameWithThumbnailBlockProps) {
	const radius = thumbnailSize / 2
	return (
		<Pressable
			onPress={onPress}
			disabled={!onPress}
			style={({ pressed }) => [styles.container, style, { opacity: pressed && onPress ? 0.75 : 1 }]}
			accessibilityRole={onPress ? 'button' : undefined}
			accessibilityLabel={name}
		>
			<View style={[styles.thumbnailWrap, { width: thumbnailSize, height: thumbnailSize, borderRadius: radius }]}>
				{imageUrl ? (
					<SmartMediaView media={imageUrl} style={[styles.thumbnailImg, { borderRadius: radius }]} resizeMode="cover" />
				) : (
					<View style={[styles.fallbackIconWrap, { borderRadius: radius }]}>
						<MaterialIcons name="shopping-bag" size={thumbnailSize * 0.5} color={themeColors.primary} />
					</View>
				)}
			</View>
			<Text style={[styles.productName, textStyle]} numberOfLines={numberOfLines}>
				{name}
			</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		flex: 1
	},
	thumbnailWrap: {
		overflow: 'hidden',
		backgroundColor: themeColors.buttonText5,
		borderWidth: 1,
		borderColor: themeColors.buttonText10,
		justifyContent: 'center',
		alignItems: 'center'
	},
	thumbnailImg: {
		width: '100%',
		height: '100%'
	},
	fallbackIconWrap: {
		width: '100%',
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: themeColors.primaryContainer
	},
	productName: {
		fontSize: 15,
		fontWeight: '700',
		color: themeColors.buttonText,
		textAlign: 'left',
		flex: 1,
		lineHeight: 18,
		includeFontPadding: false
	}
})

export default ProductNameWithThumbnailBlock
