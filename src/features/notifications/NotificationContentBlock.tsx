import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@theme'
import { SmartMediaView } from '@smart-media'

const IMAGE_SIZE = 40
const TITLE_NUMBER_OF_LINES = 1
const CONTENT_NUMBER_OF_LINES = 3

export interface NotificationContentBlockProps {
	/** Optional image (e.g. sender avatar / notification thumbnail). Hidden when not provided. */
	imageUrl?: string | null
	title: React.ReactNode
	content?: React.ReactNode
}

/**
 * Shared image + title + content block, always anchored to the top-left of
 * its container — including for RTL scripts like tn_arab, whose text would
 * otherwise auto-align to the right. Used by both notification list items
 * and the toast popup so both surfaces present notifications consistently.
 * Meant to be used as-is, with no per-consumer style overrides.
 */
export default function NotificationContentBlock({ imageUrl, title, content }: NotificationContentBlockProps) {
	const { colors } = useTheme()

	return (
		<View style={styles.container}>
			{imageUrl ? <SmartMediaView media={imageUrl} style={styles.image} containerStyle={[styles.imageContainer, { backgroundColor: colors.surface }]} /> : null}

			<View style={styles.textContainer}>
				{typeof title === 'string' ? (
					<Text style={[styles.title, { color: colors.text }]} numberOfLines={TITLE_NUMBER_OF_LINES}>
						{title}
					</Text>
				) : (
					title
				)}
				{content ? (
					typeof content === 'string' ? (
						<Text style={[styles.content, { color: colors.textSecondary }]} numberOfLines={CONTENT_NUMBER_OF_LINES}>
							{content}
						</Text>
					) : (
						content
					)
				) : null}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 10
	},
	imageContainer: {
		width: IMAGE_SIZE,
		height: IMAGE_SIZE,
		borderRadius: IMAGE_SIZE / 2,
		overflow: 'hidden',
		flexShrink: 0
	},
	image: {
		width: IMAGE_SIZE,
		height: IMAGE_SIZE,
		borderRadius: IMAGE_SIZE / 2
	},
	textContainer: {
		flex: 1,
		alignItems: 'flex-start'
	},
	title: {
		alignSelf: 'stretch',
		fontSize: 15,
		fontWeight: '700',
		lineHeight: 20,
		textAlign: 'left',
		writingDirection: 'ltr'
	},
	content: {
		alignSelf: 'stretch',
		fontSize: 13,
		lineHeight: 18,
		marginTop: 2,
		textAlign: 'left',
		writingDirection: 'ltr'
	}
})
