import React from 'react'
import { useRouter } from 'expo-router'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import HeaderActionButton from './HeaderActionButton'

const HeaderSearchButton: React.FC = React.memo(() => {
	const router = useRouter()
	const { colors } = useTheme()

	return <HeaderActionButton iconName="search-outline" onPress={() => router.push('/search')} accessibilityLabel={translate('search', 'Search')} />
})

HeaderSearchButton.displayName = 'HeaderSearchButton'

export default HeaderSearchButton
