import React from 'react'
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native'
import { useTheme } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import { BaseCard } from '@/features/common/cards/BaseCard'
import PriorityBadge, { PRIORITY_COLORS } from '@/features/common/PriorityBadge'
import ElapsedTimeBadge from '@/features/common/ElapsedTimeBadge'
import SeenBadge from '@/features/common/SeenBadge'
import { NotificationItem } from '../notifications.interface'

interface NotificationCardProps {
	item: NotificationItem
	onPress: (item: NotificationItem) => void
	/** Optional extra content rendered between the header and the notification's text, e.g. a customer block. */
	children?: React.ReactNode
}

export const NotificationCard = React.memo(function NotificationCard({ item, onPress, children }: NotificationCardProps) {
	const { colors } = useTheme()
	const { localize } = useUser()
	const { height: windowHeight } = useWindowDimensions()

	const isUnseen = !item.seenAt
	const priorityColor = item.priority ? PRIORITY_COLORS[item.priority] : undefined
	const accentColor = priorityColor ?? (isUnseen ? colors.primary : colors.info)
	const isCompact = windowHeight < 550
	const maxCardHeight = Math.max(100, windowHeight - 140)

	const handlePress = () => onPress(item)

	return (
		<BaseCard
			onPress={handlePress}
			activeOpacity={0.7}
			backgroundColor={priorityColor ? priorityColor + '0C' : isUnseen ? colors.primary + '08' : colors.background}
			borderColor={colors.border}
			style={[
				styles.card,
				{
					borderLeftColor: accentColor,
					borderLeftWidth: 4,
					minHeight: 0,
					maxHeight: maxCardHeight,
					padding: isCompact ? 10 : 16,
					marginBottom: isCompact ? 8 : 12
				}
			]}
			testID={`notification-card-${item._id}`}
		>
			{/* Header: title on the left, badges on the right */}
			<View style={[styles.cardHeader, { marginBottom: isCompact ? 6 : 10 }]}>
				<View style={styles.titleContainer}>
					{isUnseen && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
					<Text
						style={[styles.title, { color: colors.text, fontWeight: isUnseen ? '700' : '600', fontSize: isCompact ? 14 : 16, lineHeight: isCompact ? 18 : 22 }]}
						numberOfLines={windowHeight < 500 ? 1 : 2}
					>
						{localize(item.title as any)}
					</Text>
				</View>

				{windowHeight >= 480 && (
					<View style={styles.badgeGroup}>
						<ElapsedTimeBadge date={item.createdAt} color={colors.textTertiary} />
						{item.priority && <PriorityBadge priority={item.priority} />}
					</View>
				)}
			</View>

			{children && <View style={{ marginBottom: isCompact ? 8 : 12 }}>{children}</View>}

			{/* Content */}
			<Text
				style={[
					styles.content,
					{
						color: isUnseen ? colors.text : colors.textSecondary,
						fontWeight: isUnseen ? '500' : '400',
						fontSize: isCompact ? 12 : 14,
						lineHeight: isCompact ? 17 : 21,
						marginBottom: isCompact ? 8 : 12
					}
				]}
				numberOfLines={windowHeight < 500 ? 1 : windowHeight < 650 ? 2 : 3}
			>
				{localize(item.content as any)}
			</Text>

			{/* Footer */}
			<View style={styles.cardFooter}>
				<SeenBadge
					seen={!isUnseen}
					onPress={(e) => {
						e.stopPropagation()
						handlePress()
					}}
				/>
			</View>
		</BaseCard>
	)
})

const styles = StyleSheet.create({
	card: {
		borderRadius: 16
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		gap: 8
	},
	titleContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		gap: 8
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4
	},
	title: {
		flex: 1,
		lineHeight: 22,
		textAlign: 'left',
		writingDirection: 'ltr'
	},
	badgeGroup: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		flexShrink: 0
	},
	content: {
		fontSize: 14,
		lineHeight: 21
	},
	cardFooter: {
		flexDirection: 'row',
		justifyContent: 'flex-end'
	}
})
