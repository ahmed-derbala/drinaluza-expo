import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'

export interface RatingStarsProps {
	/**
	 * Numeric rating from 0 to 5.
	 */
	rating: number
	/**
	 * Size of each star icon. Defaults to 16.
	 */
	size?: number
	/**
	 * Whether the user can tap to change the rating. Defaults to false.
	 */
	interactive?: boolean
	/**
	 * Callback function triggered when rating changes.
	 */
	onRatingChange?: (rating: number) => void
	/**
	 * Custom active star color. Defaults to #FFD700.
	 */
	color?: string
}

const RatingStars: React.FC<RatingStarsProps> = ({ rating, size = 16, interactive = false, onRatingChange, color = '#FFD700' }) => {
	const { colors } = useTheme()

	const handlePress = (stars: number) => {
		if (interactive && onRatingChange) {
			onRatingChange(stars)
		}
	}

	return (
		<View style={styles.starsContainer}>
			{[1, 2, 3, 4, 5].map((star) => (
				<TouchableOpacity
					key={star}
					onPress={() => handlePress(star)}
					disabled={!interactive}
					hitSlop={interactive ? { top: 8, bottom: 8, left: 8, right: 8 } : undefined}
					accessibilityRole={interactive ? 'button' : undefined}
					accessibilityLabel={interactive ? `Rate ${star} star${star === 1 ? '' : 's'}` : undefined}
				>
					<Ionicons name={star <= rating ? 'star' : 'star-outline'} size={size} color={star <= rating ? color : colors.textSecondary} />
				</TouchableOpacity>
			))}
		</View>
	)
}

const styles = StyleSheet.create({
	starsContainer: {
		flexDirection: 'row',
		gap: 4
	}
})

export default React.memo(RatingStars)
