import React from 'react'
import { useRouter } from 'expo-router'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { useUser } from '@/core/contexts'
import HeaderActionButton from './HeaderActionButton'

interface HeaderCartButtonProps {
	badgeCount?: number
}

const HeaderCartButton: React.FC<HeaderCartButtonProps> = React.memo(({ badgeCount = 0 }) => {
	const router = useRouter()
	const { colors } = useTheme()
	const { user } = useUser()

	return (
		<HeaderActionButton
			iconName="cart-outline"
			onPress={() => router.push(user ? '/purchases?status=cart' : '/auth')}
			badgeCount={badgeCount}
			accessibilityLabel={translate('view_cart', 'View Cart')}
		/>
	)
})

HeaderCartButton.displayName = 'HeaderCartButton'

export default HeaderCartButton
