import { usePathname } from 'expo-router'

export function useHiddenOnRoutes(routes: string[]) {
	const pathname = usePathname()
	if (!pathname) return false
	return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}
