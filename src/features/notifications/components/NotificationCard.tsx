import React from 'react'
import { View, StyleSheet, useWindowDimensions } from 'react-native'
import { useTheme } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import { BaseCard } from '@/features/common/cards/BaseCard'
import PriorityBadge, { PRIORITY_COLORS } from '@/features/common/PriorityBadge'
import ElapsedTimeBadge from '@/features/common/ElapsedTimeBadge'
import NotificationContentBlock from '@/features/common/blocks/NotificationContentBlock'
import { NotificationItem } from '../notifications.interface'

interface NotificationCardProps {
	item: NotificationItem
	onPress: (item: NotificationItem) => void
	/** Optional image override (e.g. a customer avatar). Defaults to the notification's own media, if any. */
	imageUrl?: string
	/** Optional extra content rendered between the header and the notification's text, e.g. a customer block. */
	children?: React.ReactNode
}

export const NotificationCard = React.memo(function NotificationCard({ item, onPress, imageUrl, children }: NotificationCardProps) {
	const { colors } = useTheme()
	const { localize } = useUser()
	const { height: windowHeight } = useWindowDimensions()

	const isUnseen = !item.seenAt
	const priorityColor = item.priority ? PRIORITY_COLORS[item.priority] : undefined
	const accentColor = priorityColor ?? (isUnseen ? colors.primary : colors.border)
	const isCompact = windowHeight < 550
	const maxCardHeight = Math.max(100, windowHeight - 140)
	const resolvedImageUrl = imageUrl ?? item.media?.thumbnail?.url

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
					marginBottom: isCompact ? 8 : 12,
					opacity: isUnseen ? 1 : 0.55
				}
			]}
			testID={`notification-card-${item._id}`}
		>
			{/* Header: image + title + content block on the top left, badges on the top right */}
			<View style={styles.cardHeader}>
				<NotificationContentBlock
					imageUrl={resolvedImageUrl}
					title={localize(item.title as any)}
					titleStyle={{ fontWeight: isUnseen ? '700' : '600', fontSize: isCompact ? 14 : 16 }}
					titleNumberOfLines={windowHeight < 500 ? 1 : 2}
					content={localize(item.content as any)}
					contentStyle={{ fontSize: isCompact ? 12 : 14 }}
					contentNumberOfLines={windowHeight < 500 ? 1 : windowHeight < 650 ? 2 : 3}
					style={styles.contentBlock}
				/>

				{windowHeight >= 480 && (
					<View style={styles.badgeGroup}>
						<ElapsedTimeBadge date={item.createdAt} color={colors.textTertiary} />
						{item.priority && <PriorityBadge priority={item.priority} />}
					</View>
				)}
			</View>

			{children && <View style={{ marginTop: isCompact ? 8 : 12 }}>{children}</View>}
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
	contentBlock: {
		flex: 1
	},
	badgeGroup: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		flexShrink: 0
	}
})
