import React from 'react'
import { useRouter } from 'expo-router'
import { translate } from '@/core/translation'
import { useUser } from '@/core/contexts'
import { HeaderIconButton } from './HeaderIconButton'

interface HeaderCartButtonProps {
	badgeCount?: number
}

export const HeaderCartButton: React.FC<HeaderCartButtonProps> = React.memo(({ badgeCount = 0 }) => {
	const router = useRouter()
	const { user } = useUser()

	return <HeaderIconButton icon="cart-outline" onPress={() => router.push(user ? '/purchases?status=cart' : '/auth')} badgeCount={badgeCount} label={translate('view_cart', 'View Cart')} />
})

HeaderCartButton.displayName = 'HeaderCartButton'
