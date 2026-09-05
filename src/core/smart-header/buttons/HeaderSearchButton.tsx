import React from 'react'
import { useRouter } from 'expo-router'
import { translate } from '@translation'
import { HeaderIconBaseButton } from './HeaderIconBaseButton'

export const HeaderSearchButton: React.FC = React.memo(() => {
	const router = useRouter()

	return <HeaderIconBaseButton icon="search-outline" onPress={() => router.push('/search')} label={translate('search', 'Search')} />
})

HeaderSearchButton.displayName = 'HeaderSearchButton'
