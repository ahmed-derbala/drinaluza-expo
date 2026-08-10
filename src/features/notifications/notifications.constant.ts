import { themeColors } from '@/core/theme'

export const NOTIFICATIONS_TEMPLATES = {
	PURCHASE_REQUEST: 'purchase_request',
	PURCHASE_CREATED: 'purchase_created',
	PURCHASE_UPDATED_BY_BUSINESS: 'purchase_updated_by_business',
	PURCHASE_UPDATED_BY_CUSTOMER: 'purchase_updated_by_customer'
}

/**
 * One color per template group, derived from the slug prefix before the first `_`
 * (e.g. `purchase_request` and `purchase_created` are both in the `purchase` group).
 * Every template within a group shares the same accent color, used for notification
 * card and toast borders.
 */
export const NOTIFICATION_TEMPLATE_GROUP_COLORS: Record<string, string> = {
	purchase: themeColors.primary,
	sale: themeColors.success
}

export function getNotificationTemplateColor(templateSlug?: string): string | undefined {
	const group = templateSlug?.split('_')[0]
	return group ? NOTIFICATION_TEMPLATE_GROUP_COLORS[group] : undefined
}
