import { themeColors } from '@theme'
import { translate } from '@translation'
// Mirrors the backend order lifecycle (ORDER_STATUSES_ALL + PERMITTED_ORDERS_TRANSITIONS).
export const ORDER_STATUSES = {
	PENDING: 'pending', // Order placed / awaiting business response or catch-weight adjustments
	ACTION_REQUIRED: 'action_required', // Customer must re-approve modified prices/weights
	ACCEPTED: 'accepted', // Business accepted order (or customer approved changes)
	PREPARING: 'preparing', // Seafood being cleaned, weighed, packaged
	READY_FOR_PICKUP: 'ready_for_pickup', // Self-pickup: packed & awaiting customer at store counter
	FINDING_COURIER: 'finding_courier', // Courier delivery: searching for/broadcasting to nearby drivers
	COURIER_ASSIGNED: 'courier_assigned', // Courier accepted & en route to business
	DELIVERING: 'delivering', // In transit to customer (via courier or business driver)
	DELIVERED: 'delivered', // Terminal success state
	CANCELLED: 'cancelled' // Terminal cancelled state
} as const
export const ORDER_STATUSES_ALL = Object.values(ORDER_STATUSES)
export type OrderStatus = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES]
// Purchase list tabs (mirrors backend PURCHASES_TAB_STATUSES, fetched via ?tab=)
export const PURCHASE_TABS = {
	ACTIVE: 'active',
	ACTION_REQUIRED: 'action_required',
	HISTORY: 'history'
} as const
export type PurchaseTab = (typeof PURCHASE_TABS)[keyof typeof PURCHASE_TABS]
// Sales list tabs (mirrors backend SALES_TAB_STATUSES, fetched via ?tab=)
export const SALES_TABS = {
	NEW: 'new',
	PREPARING: 'preparing',
	DISPATCH: 'dispatch',
	HISTORY: 'history'
} as const
export type SalesTab = (typeof SALES_TABS)[keyof typeof SALES_TABS]
export const orderStatusColors: Record<string, string> = {
	[ORDER_STATUSES.PENDING]: themeColors.warning,
	[ORDER_STATUSES.ACTION_REQUIRED]: themeColors.error,
	[ORDER_STATUSES.ACCEPTED]: themeColors.info,
	[ORDER_STATUSES.PREPARING]: themeColors.primary,
	[ORDER_STATUSES.READY_FOR_PICKUP]: themeColors.success,
	[ORDER_STATUSES.FINDING_COURIER]: themeColors.info,
	[ORDER_STATUSES.COURIER_ASSIGNED]: themeColors.info,
	[ORDER_STATUSES.DELIVERING]: themeColors.primary,
	[ORDER_STATUSES.DELIVERED]: themeColors.success,
	[ORDER_STATUSES.CANCELLED]: themeColors.textTertiary
}
export const orderStatusLabels: Record<string, string> = {
	[ORDER_STATUSES.PENDING]: translate('status_pending', 'Pending'),
	[ORDER_STATUSES.ACTION_REQUIRED]: translate('status_action_required', 'Action Required'),
	[ORDER_STATUSES.ACCEPTED]: translate('status_accepted', 'Accepted'),
	[ORDER_STATUSES.PREPARING]: translate('status_preparing', 'Preparing'),
	[ORDER_STATUSES.READY_FOR_PICKUP]: translate('status_ready_for_pickup', 'Ready for Pickup'),
	[ORDER_STATUSES.FINDING_COURIER]: translate('status_finding_courier', 'Finding Courier'),
	[ORDER_STATUSES.COURIER_ASSIGNED]: translate('status_courier_assigned', 'Courier Assigned'),
	[ORDER_STATUSES.DELIVERING]: translate('status_delivering', 'Delivering'),
	[ORDER_STATUSES.DELIVERED]: translate('status_delivered', 'Delivered'),
	[ORDER_STATUSES.CANCELLED]: translate('status_cancelled', 'Cancelled')
}
export const orderStatusIcons: Record<string, string> = {
	all: 'list',
	cart: 'cart-outline',
	[ORDER_STATUSES.PENDING]: 'time-outline',
	[ORDER_STATUSES.ACTION_REQUIRED]: 'alert-circle-outline',
	[ORDER_STATUSES.ACCEPTED]: 'checkmark-circle-outline',
	[ORDER_STATUSES.PREPARING]: 'restaurant-outline',
	[ORDER_STATUSES.READY_FOR_PICKUP]: 'bag-outline',
	[ORDER_STATUSES.FINDING_COURIER]: 'search-outline',
	[ORDER_STATUSES.COURIER_ASSIGNED]: 'bicycle-outline',
	[ORDER_STATUSES.DELIVERING]: 'car-outline',
	[ORDER_STATUSES.DELIVERED]: 'checkmark-done-outline',
	[ORDER_STATUSES.CANCELLED]: 'close-circle-outline'
}
export type OrderActor = 'customer' | 'business' | 'courier'
// Get next valid statuses for progression (mirrors PERMITTED_ORDERS_TRANSITIONS)
export const ORDER_TRANSITIONS: Record<OrderActor, { from: string; to: string }[]> = {
	customer: [
		{ from: ORDER_STATUSES.PENDING, to: ORDER_STATUSES.CANCELLED },
		{ from: ORDER_STATUSES.ACTION_REQUIRED, to: ORDER_STATUSES.ACCEPTED },
		{ from: ORDER_STATUSES.ACTION_REQUIRED, to: ORDER_STATUSES.CANCELLED },
		{ from: ORDER_STATUSES.READY_FOR_PICKUP, to: ORDER_STATUSES.DELIVERED }
	],
	business: [
		{ from: ORDER_STATUSES.PENDING, to: ORDER_STATUSES.ACTION_REQUIRED },
		{ from: ORDER_STATUSES.PENDING, to: ORDER_STATUSES.ACCEPTED },
		{ from: ORDER_STATUSES.PENDING, to: ORDER_STATUSES.CANCELLED },
		{ from: ORDER_STATUSES.ACCEPTED, to: ORDER_STATUSES.PREPARING },
		{ from: ORDER_STATUSES.PREPARING, to: ORDER_STATUSES.READY_FOR_PICKUP },
		{ from: ORDER_STATUSES.PREPARING, to: ORDER_STATUSES.FINDING_COURIER },
		{ from: ORDER_STATUSES.PREPARING, to: ORDER_STATUSES.CANCELLED }
	],
	courier: [
		{ from: ORDER_STATUSES.FINDING_COURIER, to: ORDER_STATUSES.COURIER_ASSIGNED },
		{ from: ORDER_STATUSES.COURIER_ASSIGNED, to: ORDER_STATUSES.DELIVERING },
		{ from: ORDER_STATUSES.DELIVERING, to: ORDER_STATUSES.DELIVERED }
	]
}
export const getNextValidStatuses = (currentStatus: string, actor: OrderActor = 'business'): string[] => {
	return ORDER_TRANSITIONS[actor].filter((t) => t.from === currentStatus).map((t) => t.to)
}
