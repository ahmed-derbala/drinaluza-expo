import React from 'react'
import { useRouter, usePathname } from 'expo-router'
import { translate } from '@/core/translation'
import { useUser } from '@/core/contexts'
import { useCartCount } from '@/features/purchases/hooks/useCartCount'
import { useHiddenOnRoutes } from './useHiddenOnRoutes'
import { HeaderIconButton } from './HeaderIconButton'

// Add route prefixes where the cart button should not appear.
const HIDDEN_ON_ROUTES = ['/dashboard']

export const HeaderCartButton: React.FC = React.memo(() => {
	const router = useRouter()
	const pathname = usePathname()
	let user: any = null
	let badgeCount = 0
	try {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const ctx = useUser()
		user = (ctx as any)?.user ?? null
	} catch {
		user = null
	}
	try {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const count = useCartCount()
		badgeCount = typeof count === 'number' ? count : 0
	} catch {
		badgeCount = 0
	}

	const hidden = useHiddenOnRoutes(HIDDEN_ON_ROUTES)
	if (hidden) return null

	const handlePress = () => {
		if (!user) {
			router.push('/auth')
			return
		}

		if (pathname === '/purchases') {
			router.setParams({ status: 'cart' })
			return
		}

		router.push('/purchases?status=cart')
	}

	return <HeaderIconButton icon="cart-outline" onPress={handlePress} badgeCount={badgeCount} label={translate('view_cart', 'View Cart')} />
})

HeaderCartButton.displayName = 'HeaderCartButton'
