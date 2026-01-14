export const DEEP_LINKING_CONFIG = {
	schemes: ['drinaluza'],
	paths: {
		// Auth routes
		auth: {
			path: '/auth',
			exact: true
		},

		// Main app routes
		feed: {
			path: '/home/feed',
			exact: true
		},

		// Business routes (shop_owner only)
		business: {
			path: '/home/business',
			exact: true
		},
		businessShops: {
			path: '/home/business/my-shops',
			exact: true
		},
		businessProducts: {
			path: '/home/business/my-products',
			exact: true
		},
		businessSales: {
			path: '/home/business/sales',
			exact: true
		},
		createProduct: {
			path: '/home/business/create-product',
			exact: true
		},

		// Shop routes (public)
		shops: {
			path: '/home/shops',
			exact: true
		},
		shopDetails: {
			path: '/home/shops/:shopId',
			exact: true
		},
		shopProducts: {
			path: '/home/shops/:shopId/products',
			exact: true
		},

		// User routes
		profile: {
			path: '/home/profile',
			exact: true
		},
		settings: {
			path: '/home/settings',
			exact: true
		},
		notifications: {
			path: '/home/notifications',
			exact: true
		},
		dashboard: {
			path: '/home/dashboard',
			exact: true
		}
	}
}

export const getDeepLinkUrl = (route: keyof typeof DEEP_LINKING_CONFIG.paths, params?: Record<string, string>): string => {
	const config = DEEP_LINKING_CONFIG.paths[route]
	let url = config.path

	if (params) {
		Object.entries(params).forEach(([key, value]) => {
			url = url.replace(`:${key}`, value)
		})
	}

	return url
}

export const generateDeepLink = (route: keyof typeof DEEP_LINKING_CONFIG.paths, params?: Record<string, string>): string => {
	const url = getDeepLinkUrl(route, params)
	return `${DEEP_LINKING_CONFIG.schemes[0]}://${url}`
}
