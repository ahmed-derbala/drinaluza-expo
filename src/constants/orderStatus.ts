export const orderStatusEnum = {
	PENDING_SHOP_CONFIRMATION: 'pending_shop_confirmation',
	DELIVERING_TO_USER: 'delivering_to_user',
	DELIVERED_TO_USER: 'delivered_to_user',
	RECEIVED_BY_USER: 'received_by_user',
	CANCELLED_BY_USER: 'cancelled_by_user',
	CANCELLED_BY_SHOP: 'cancelled_by_shop'
}

export const orderStatusColors = {
	[orderStatusEnum.PENDING_SHOP_CONFIRMATION]: '#FFA500', // Orange
	[orderStatusEnum.DELIVERING_TO_USER]: '#2196F3', // Blue
	[orderStatusEnum.DELIVERED_TO_USER]: '#4CAF50', // Green
	[orderStatusEnum.RECEIVED_BY_USER]: '#8BC34A', // Light Green
	[orderStatusEnum.CANCELLED_BY_USER]: '#F44336', // Red
	[orderStatusEnum.CANCELLED_BY_SHOP]: '#9C27B0' // Purple
}

export const orderStatusLabels = {
	[orderStatusEnum.PENDING_SHOP_CONFIRMATION]: 'Pending Confirmation',
	[orderStatusEnum.DELIVERING_TO_USER]: 'Delivering',
	[orderStatusEnum.DELIVERED_TO_USER]: 'Delivered',
	[orderStatusEnum.RECEIVED_BY_USER]: 'Received',
	[orderStatusEnum.CANCELLED_BY_USER]: 'Cancelled by User',
	[orderStatusEnum.CANCELLED_BY_SHOP]: 'Cancelled by Shop'
}

// Get next valid statuses for progression
export const getNextValidStatuses = (currentStatus: string): string[] => {
	const progressionOrder = [orderStatusEnum.PENDING_SHOP_CONFIRMATION, orderStatusEnum.DELIVERING_TO_USER, orderStatusEnum.DELIVERED_TO_USER]

	const currentIndex = progressionOrder.indexOf(currentStatus)

	// If cancelled or not found, no progression allowed
	if (currentIndex === -1 || currentStatus === orderStatusEnum.CANCELLED_BY_USER || currentStatus === orderStatusEnum.CANCELLED_BY_SHOP) {
		return []
	}

	// Return next statuses in progression
	return progressionOrder.slice(currentIndex + 1)
}
