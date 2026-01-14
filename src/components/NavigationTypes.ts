// Type definitions for better navigation type safety
export type RootStackParamList = {
	'(auth)': undefined
	'(home)': undefined
	index: undefined
}

export type HomeTabParamList = {
	feed: undefined
	dashboard: undefined
	business: undefined
	notifications: undefined
	profile: undefined
	settings: undefined
	shops: undefined
	purchases: undefined
}

export type BusinessStackParamList = {
	'business/index': undefined
	'business/my-shops': undefined
	'business/my-products': undefined
	'business/sales': undefined
	'business/create-product': undefined
	'business/shops/[shopSlug]': { shopSlug: string }
}

export type ShopsStackParamList = {
	'shops/index': undefined
	'shops/[shopId]': { shopId: string }
	'shops/[shopId]/products': { shopId: string }
}

export type AuthStackParamList = {
	'auth/index': undefined
}

// Union type for all possible navigation params
export type NavigationParamList = RootStackParamList & HomeTabParamList & BusinessStackParamList & ShopsStackParamList & AuthStackParamList

// Helper type for route names
export type RouteName = keyof NavigationParamList

// Type guards for navigation
export function isBusinessRoute(route: string): route is keyof BusinessStackParamList {
	return route.startsWith('business/')
}

export function isShopsRoute(route: string): route is keyof ShopsStackParamList {
	return route.startsWith('shops/')
}

export function isAuthRoute(route: string): route is keyof AuthStackParamList {
	return route.startsWith('auth/')
}

export function isHomeTabRoute(route: string): route is keyof HomeTabParamList {
	const homeTabRoutes: (keyof HomeTabParamList)[] = ['feed', 'dashboard', 'business', 'notifications', 'profile', 'settings', 'shops', 'purchases']
	return homeTabRoutes.includes(route as keyof HomeTabParamList)
}
