import { translate } from '../../core/translation'

export const ORDER_STATUSES = {
	PENDING_BUSINESS_CONFIRMATION: 'pending_business_confirmation', //active
	CONFIRMED_BY_BUSINESS: 'confirmed_by_business', //active
	RESERVED_BY_BUSINESS_FOR_PICKUP_BY_CUSTOMER: 'reserved_by_business_for_pickup_by_customer', //active
	RESERVATION_EXPIRED: 'reservation_expired', //done
	DELIVERING_TO_CUSTOMER: 'delivering_to_customer', //active
	DELIVERED_TO_CUSTOMER: 'delivered_to_customer', //done
	RECEIVED_BY_CUSTOMER: 'received_by_customer', //done
	CANCELLED_BY_CUSTOMER: 'cancelled_by_customer', //cancelled
	CANCELLED_BY_BUSINESS: 'cancelled_by_business' //cancelled
}

// Alias for external usage (matches requested naming)
const orderStatuses = ORDER_STATUSES

export const orderStatusColors = {
	[ORDER_STATUSES.PENDING_BUSINESS_CONFIRMATION]: '#FFA500', // Orange
	[ORDER_STATUSES.CONFIRMED_BY_BUSINESS]: '#2196F3', // Blue
	[ORDER_STATUSES.RESERVED_BY_BUSINESS_FOR_PICKUP_BY_CUSTOMER]: '#9C27B0', // Purple
	[ORDER_STATUSES.RESERVATION_EXPIRED]: '#607D8B', // Blue Grey
	[ORDER_STATUSES.DELIVERING_TO_CUSTOMER]: '#03A9F4', // Light Blue
	[ORDER_STATUSES.DELIVERED_TO_CUSTOMER]: '#4CAF50', // Green
	[ORDER_STATUSES.RECEIVED_BY_CUSTOMER]: '#8BC34A', // Light Green
	[ORDER_STATUSES.CANCELLED_BY_CUSTOMER]: '#F44336', // Red
	[ORDER_STATUSES.CANCELLED_BY_BUSINESS]: '#F44336' // Red
}

export const orderStatusLabels = {
	[ORDER_STATUSES.PENDING_BUSINESS_CONFIRMATION]: translate('pending_businessconfirmation', 'Pending Confirmation'),
	[ORDER_STATUSES.CONFIRMED_BY_BUSINESS]: translate('confirmed_by_business', 'Confirmed'),
	[ORDER_STATUSES.RESERVED_BY_BUSINESS_FOR_PICKUP_BY_CUSTOMER]: translate('reserved_by_businessfor_pickup_by_customer', 'Ready for Pickup'),
	[ORDER_STATUSES.RESERVATION_EXPIRED]: translate('reservation_expired', 'Reservation Expired'),
	[ORDER_STATUSES.DELIVERING_TO_CUSTOMER]: translate('delivering_to_customer', 'Delivering'),
	[ORDER_STATUSES.DELIVERED_TO_CUSTOMER]: translate('delivered_to_customer', 'Delivered'),
	[ORDER_STATUSES.RECEIVED_BY_CUSTOMER]: translate('received_by_customer', 'Received'),
	[ORDER_STATUSES.CANCELLED_BY_CUSTOMER]: translate('cancelled_by_customer', 'Cancelled'),
	[ORDER_STATUSES.CANCELLED_BY_BUSINESS]: translate('cancelled_by_business', 'Cancelled by Business')
}

export const orderStatusIcons: Record<string, string> = {
	all: 'list',
	cart: 'cart-outline',
	[ORDER_STATUSES.PENDING_BUSINESS_CONFIRMATION]: 'time-outline',
	[ORDER_STATUSES.CONFIRMED_BY_BUSINESS]: 'checkmark-circle-outline',
	[ORDER_STATUSES.RESERVED_BY_BUSINESS_FOR_PICKUP_BY_CUSTOMER]: 'bag-outline',
	[ORDER_STATUSES.DELIVERING_TO_CUSTOMER]: 'car-outline',
	[ORDER_STATUSES.DELIVERED_TO_CUSTOMER]: 'checkmark-done-outline',
	[ORDER_STATUSES.RECEIVED_BY_CUSTOMER]: 'thumbs-up-outline',
	[ORDER_STATUSES.RESERVATION_EXPIRED]: 'alert-circle-outline',
	[ORDER_STATUSES.CANCELLED_BY_CUSTOMER]: 'close-circle-outline',
	[ORDER_STATUSES.CANCELLED_BY_BUSINESS]: 'close-circle-outline'
}

// Get next valid statuses for progression
const getNextValidStatuses = (currentStatus: string): string[] => {
	switch (currentStatus) {
		case ORDER_STATUSES.PENDING_BUSINESS_CONFIRMATION:
			return [ORDER_STATUSES.CONFIRMED_BY_BUSINESS]
		case ORDER_STATUSES.CONFIRMED_BY_BUSINESS:
			return [ORDER_STATUSES.RESERVED_BY_BUSINESS_FOR_PICKUP_BY_CUSTOMER, ORDER_STATUSES.DELIVERING_TO_CUSTOMER]
		case ORDER_STATUSES.RESERVED_BY_BUSINESS_FOR_PICKUP_BY_CUSTOMER:
			return [ORDER_STATUSES.DELIVERED_TO_CUSTOMER]
		case ORDER_STATUSES.DELIVERING_TO_CUSTOMER:
			return [ORDER_STATUSES.DELIVERED_TO_CUSTOMER]
		default:
			return []
	}
}
