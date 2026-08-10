import React from 'react'
import { Platform } from 'react-native'
import { useRouter, Href } from 'expo-router'
import { translate } from '@/core/translation'
import { HeaderIconButton } from './HeaderIconButton'

export interface HeaderBackButtonProps {
	onPress?: () => void
	fallbackRoute?: Href
}

export const HeaderBackButton: React.FC<HeaderBackButtonProps> = React.memo(({ onPress, fallbackRoute = '/feed' }) => {
	const router = useRouter()

	const handlePress = () => {
		if (onPress) {
			onPress()
		} else if (router.canGoBack()) {
			router.back()
		} else {
			router.replace(fallbackRoute)
		}
	}

	return <HeaderIconButton icon={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} label={translate('go_back', 'Go back')} onPress={handlePress} />
})

HeaderBackButton.displayName = 'HeaderBackButton'
