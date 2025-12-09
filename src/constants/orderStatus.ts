export const orderStatusEnum = {
	PENDING_SHOP_CONFIRMATION: 'pending_shop_confirmation', //active
	CONFIRMED_BY_SHOP: 'confirmed_by_shop', //active
	RESERVED_BY_SHOP_FOR_PICKUP_BY_CUSTOMER: 'reserved_by_shop_for_pickup_by_customer', //active
	RESERVATION_EXPIRED: 'reservation_expired', //done
	DELIVERING_TO_CUSTOMER: 'delivering_to_customer', //active
	DELIVERED_TO_CUSTOMER: 'delivered_to_customer', //done
	RECEIVED_BY_CUSTOMER: 'received_by_customer', //done
	CANCELLED_BY_CUSTOMER: 'cancelled_by_customer', //cancelled
	CANCELLED_BY_SHOP: 'cancelled_by_shop' //cancelled
}

export const orderStatusColors = {
	[orderStatusEnum.PENDING_SHOP_CONFIRMATION]: '#FFA500', // Orange
	[orderStatusEnum.CONFIRMED_BY_SHOP]: '#2196F3', // Blue
	[orderStatusEnum.RESERVED_BY_SHOP_FOR_PICKUP_BY_CUSTOMER]: '#9C27B0', // Purple
	[orderStatusEnum.RESERVATION_EXPIRED]: '#607D8B', // Blue Grey
	[orderStatusEnum.DELIVERING_TO_CUSTOMER]: '#03A9F4', // Light Blue
	[orderStatusEnum.DELIVERED_TO_CUSTOMER]: '#4CAF50', // Green
	[orderStatusEnum.RECEIVED_BY_CUSTOMER]: '#8BC34A', // Light Green
	[orderStatusEnum.CANCELLED_BY_CUSTOMER]: '#F44336', // Red
	[orderStatusEnum.CANCELLED_BY_SHOP]: '#F44336' // Red
}

export const orderStatusLabels = {
	[orderStatusEnum.PENDING_SHOP_CONFIRMATION]: 'Pending Confirmation',
	[orderStatusEnum.CONFIRMED_BY_SHOP]: 'Confirmed',
	[orderStatusEnum.RESERVED_BY_SHOP_FOR_PICKUP_BY_CUSTOMER]: 'Ready for Pickup',
	[orderStatusEnum.RESERVATION_EXPIRED]: 'Reservation Expired',
	[orderStatusEnum.DELIVERING_TO_CUSTOMER]: 'Delivering',
	[orderStatusEnum.DELIVERED_TO_CUSTOMER]: 'Delivered',
	[orderStatusEnum.RECEIVED_BY_CUSTOMER]: 'Received',
	[orderStatusEnum.CANCELLED_BY_CUSTOMER]: 'Cancelled',
	[orderStatusEnum.CANCELLED_BY_SHOP]: 'Cancelled by Shop'
}

// Get next valid statuses for progression
export const getNextValidStatuses = (currentStatus: string): string[] => {
	return []
}
