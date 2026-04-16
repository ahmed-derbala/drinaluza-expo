import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { useTheme } from '../../core/contexts/ThemeContext'
import { useUser } from '../../core/contexts/UserContext'
import { getReviews, createReview } from './reviews.api'
import { Review } from './reviews.interface'

type ReviewSectionProps = {
	targetResource: 'shops' | 'products' | 'users'
	targetId: string
	targetName?: string
}

export default function ReviewSection({ targetResource, targetId, targetName }: ReviewSectionProps) {
	const { colors } = useTheme()
	const { localize, translate, user } = useUser()
	const [reviews, setReviews] = useState<Review[]>([])
	const [loading, setLoading] = useState(true)
	const [submitting, setSubmitting] = useState(false)
	const [showAddReview, setShowAddReview] = useState(false)
	const [newReview, setNewReview] = useState({ stars: 5, comment: '' })
	const [isAnonymous, setIsAnonymous] = useState(false)
	const [pagination, setPagination] = useState({
		totalDocs: 0,
		totalPages: 0,
		page: 1,
		limit: 10,
		hasNextPage: false
	})

	const loadReviews = useCallback(
		async (page: number = 1) => {
			try {
				setLoading(true)
				const response = await getReviews(targetResource, targetId, page, 10)
				setReviews((prevReviews) => (page === 1 ? response.data.docs : [...prevReviews, ...response.data.docs]))
				setPagination(response.data.pagination)
			} catch (error) {
				console.error('Failed to load reviews:', error)
			} finally {
				setLoading(false)
			}
		},
		[targetResource, targetId]
	)

	useEffect(() => {
		loadReviews()
	}, [loadReviews])

	const handleStarPress = (stars: number) => {
		setNewReview({ ...newReview, stars })
	}

	const handleSubmitReview = async () => {
		if (!newReview.comment.trim()) {
			Alert.alert(translate('error', 'Error'), translate('please_enter_comment', 'Please enter a comment'))
			return
		}

		try {
			setSubmitting(true)
			await createReview(targetResource, targetId, newReview, isAnonymous)
			setNewReview({ stars: 5, comment: '' })
			setShowAddReview(false)
			setIsAnonymous(false)
			loadReviews(1)
			Alert.alert(translate('success', 'Success'), translate('review_submitted', 'Review submitted successfully'))
		} catch (error: any) {
			console.error('Failed to submit review:', error)
			if (error?.response?.status === 429) {
				Alert.alert(translate('error', 'Error'), translate('rate_limit_exceeded', 'Too many review requests. Please wait a moment before trying again.'))
			} else {
				Alert.alert(translate('error', 'Error'), translate('failed_to_submit_review', 'Failed to submit review'))
			}
		} finally {
			setSubmitting(false)
		}
	}

	const renderStars = (stars: number, interactive: boolean = false) => {
		return (
			<View style={styles.starsContainer}>
				{[1, 2, 3, 4, 5].map((star) => (
					<TouchableOpacity key={star} onPress={() => interactive && handleStarPress(star)} disabled={!interactive} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
						<Ionicons name={star <= stars ? 'star' : 'star-outline'} size={interactive ? 28 : 16} color={star <= stars ? '#FFD700' : colors.textSecondary} />
					</TouchableOpacity>
				))}
			</View>
		)
	}

	const renderReviewItem = (review: Review) => (
		<View key={review._id} style={[styles.reviewItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
			<View style={styles.reviewHeader}>
				<View style={styles.authorInfo}>
					<View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryContainer }]}>
						<Ionicons name="person" size={20} color={colors.primary} />
					</View>
					<View style={styles.authorDetails}>
						<Text style={[styles.authorName, { color: colors.text }]} numberOfLines={1}>
							{review.author?.name ? localize(review.author.name) : 'Anonymous'}
						</Text>
						<Text style={[styles.reviewDate, { color: colors.textSecondary }]}>{new Date(review.createdAt).toLocaleDateString()}</Text>
					</View>
				</View>
				{renderStars(review.stars)}
			</View>
			<Text style={[styles.reviewComment, { color: colors.text }]}>{review.comment}</Text>
		</View>
	)

	const averageRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length : 0

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<Text style={[styles.headerTitle, { color: colors.text }]}>{translate('reviews', 'Reviews')}</Text>
					{pagination.totalDocs > 0 && (
						<View style={styles.ratingSummary}>
							<Ionicons name="star" size={16} color="#FFD700" />
							<Text style={[styles.ratingText, { color: colors.text }]}>{averageRating.toFixed(1)}</Text>
							<Text style={[styles.reviewCount, { color: colors.textSecondary }]}>({pagination.totalDocs})</Text>
						</View>
					)}
				</View>
				<TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => setShowAddReview(!showAddReview)}>
					<Ionicons name={showAddReview ? 'close' : 'add'} size={20} color="#fff" />
				</TouchableOpacity>
			</View>

			{/* Add Review Form */}
			{showAddReview && (
				<View style={[styles.addReviewForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<Text style={[styles.formTitle, { color: colors.text }]}>
						{translate('write_review', 'Write a Review')}
						{targetName && ` for ${targetName}`}
					</Text>
					<View style={styles.starsWrapper}>{renderStars(newReview.stars, true)}</View>

					{/* Anonymous Toggle */}
					<TouchableOpacity style={styles.anonymousToggle} onPress={() => setIsAnonymous(!isAnonymous)} activeOpacity={0.7}>
						<View style={[styles.toggleTrack, { backgroundColor: isAnonymous ? colors.primary : colors.surfaceVariant }]}>
							<View style={[styles.toggleThumb, { backgroundColor: '#fff', transform: [{ translateX: isAnonymous ? 20 : 0 }] }]} />
						</View>
						<Text style={[styles.toggleLabel, { color: colors.text }]}>{translate('post_anonymously', 'Post anonymously')}</Text>
					</TouchableOpacity>

					<TextInput
						style={[styles.commentInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
						placeholder={translate('your_comment', 'Your comment')}
						placeholderTextColor={colors.textSecondary}
						multiline
						numberOfLines={4}
						value={newReview.comment}
						onChangeText={(text) => setNewReview({ ...newReview, comment: text })}
					/>
					<TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]} onPress={handleSubmitReview} disabled={submitting}>
						{submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>{translate('submit_review', 'Submit Review')}</Text>}
					</TouchableOpacity>
				</View>
			)}

			{/* Reviews List */}
			{loading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			) : reviews.length === 0 ? (
				<View style={styles.emptyContainer}>
					<Ionicons name="star-outline" size={48} color={colors.textTertiary} />
					<Text style={[styles.emptyText, { color: colors.textSecondary }]}>{translate('no_reviews_yet', 'No reviews yet')}</Text>
					<Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>{translate('be_first_to_review', 'Be the first to review')}</Text>
				</View>
			) : (
				<ScrollView style={styles.reviewsList}>
					{reviews.map(renderReviewItem)}
					{pagination.hasNextPage && (
						<TouchableOpacity style={[styles.loadMoreButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => loadReviews(pagination.page + 1)}>
							<Text style={[styles.loadMoreText, { color: colors.primary }]}>{translate('load_more', 'Load More')}</Text>
						</TouchableOpacity>
					)}
				</ScrollView>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		marginTop: 24
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '700'
	},
	ratingSummary: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4
	},
	ratingText: {
		fontSize: 16,
		fontWeight: '600'
	},
	reviewCount: {
		fontSize: 14
	},
	addButton: {
		width: 40,
		height: 40,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center'
	},
	addReviewForm: {
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
		marginBottom: 16
	},
	formTitle: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 12
	},
	starsWrapper: {
		marginBottom: 12
	},
	anonymousToggle: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginBottom: 12
	},
	toggleTrack: {
		width: 48,
		height: 28,
		borderRadius: 14,
		padding: 2
	},
	toggleThumb: {
		width: 24,
		height: 24,
		borderRadius: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 2,
		elevation: 2
	},
	toggleLabel: {
		fontSize: 14,
		fontWeight: '500'
	},
	starsContainer: {
		flexDirection: 'row',
		gap: 4
	},
	commentInput: {
		borderWidth: 1,
		borderRadius: 12,
		padding: 12,
		fontSize: 14,
		textAlignVertical: 'top',
		minHeight: 80,
		marginBottom: 12
	},
	submitButton: {
		paddingVertical: 12,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center'
	},
	submitButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600'
	},
	loadingContainer: {
		padding: 40,
		alignItems: 'center'
	},
	emptyContainer: {
		padding: 40,
		alignItems: 'center',
		gap: 12
	},
	emptyText: {
		fontSize: 16,
		fontWeight: '500'
	},
	emptySubtext: {
		fontSize: 14
	},
	reviewsList: {
		maxHeight: 400
	},
	reviewItem: {
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		marginBottom: 12
	},
	reviewHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8
	},
	authorInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12
	},
	avatarPlaceholder: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: 'center',
		alignItems: 'center'
	},
	authorDetails: {
		gap: 2
	},
	authorName: {
		fontSize: 14,
		fontWeight: '600',
		maxWidth: 150
	},
	reviewDate: {
		fontSize: 12
	},
	reviewComment: {
		fontSize: 14,
		lineHeight: 20
	},
	loadMoreButton: {
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		alignItems: 'center',
		marginTop: 8
	},
	loadMoreText: {
		fontSize: 14,
		fontWeight: '600'
	}
})
