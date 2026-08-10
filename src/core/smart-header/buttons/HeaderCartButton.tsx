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
	const { user } = useUser()
	const badgeCount = useCartCount()

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
