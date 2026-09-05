import { useCallback } from 'react'
import { Linking, Platform } from 'react-native'
import { useTheme } from '@theme'
import { log } from '@log'
import { HeaderIconBaseButton } from './HeaderIconBaseButton'

export interface HeaderAllowPushButtonProps {
	onPermissionResult?: (granted: boolean) => void
	size?: number
	label?: string
}

export function HeaderAllowPushButton({ onPermissionResult, size = 38, label = 'Allow Notifications' }: HeaderAllowPushButtonProps) {
	const { colors } = useTheme()

	const openNotificationSettings = useCallback(async () => {
		if (Platform.OS !== 'android') {
			Linking.openSettings()
			return
		}
		try {
			const { startActivityAsync } = require('expo-intent-launcher')
			const { applicationId } = require('expo-application')
			await startActivityAsync('android.settings.APP_NOTIFICATION_SETTINGS', {
				extra: {
					'android.provider.extra.APP_PACKAGE': applicationId ?? 'com.ahmedderbala.drinaluza'
				}
			})
		} catch (err) {
			log({ level: 'warn', label: 'HeaderAllowPushButton', message: 'Failed to open notification settings, falling back to app settings', error: err })
			Linking.openSettings()
		}
	}, [])

	const handlePress = useCallback(async () => {
		try {
			const Notifications = require('expo-notifications')
			const { granted, canAskAgain } = await Notifications.requestPermissionsAsync()

			onPermissionResult?.(granted)

			if (Platform.OS === 'android' && !granted && !canAskAgain) {
				openNotificationSettings()
			}
		} catch (err) {
			log({ level: 'warn', label: 'HeaderAllowPushButton', message: 'Failed to request permissions', error: err })
		}
	}, [onPermissionResult, openNotificationSettings])

	return <HeaderIconBaseButton icon="notifications-outline" label={label} onPress={handlePress} size={size} iconColor={colors.warning} />
}
