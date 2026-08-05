import React from 'react'
import { useRouter } from 'expo-router'
import { translate } from '@/core/translation'
import { HeaderIconButton } from './HeaderIconButton'

export const HeaderSearchButton: React.FC = React.memo(() => {
	const router = useRouter()

	return <HeaderIconButton icon="search-outline" onPress={() => router.push('/search')} label={translate('search', 'Search')} />
})

HeaderSearchButton.displayName = 'HeaderSearchButton'
