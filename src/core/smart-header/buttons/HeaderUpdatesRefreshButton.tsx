import { useCallback, useEffect, useState } from 'react'
import { useTheme } from '@theme'
import { config } from '@/config'
import { log } from '@log'
import { HeaderIconBaseButton } from './HeaderIconBaseButton'

export interface HeaderUpdatesRefreshButtonProps {
	onRefresh?: () => void | Promise<void>
	isRefreshing?: boolean
	size?: number
	disabled?: boolean
}

/**
 * Refresh button for the Updates screen only. Probes `config.updates.checkUrl`
 * availability (lightweight HEAD request) and renders an offline state when
 * the release endpoint cannot be reached, instead of firing a doomed check.
 */
export function HeaderUpdatesRefreshButton({ onRefresh, isRefreshing = false, size, disabled = false }: HeaderUpdatesRefreshButtonProps) {
	const { colors } = useTheme()
	// null = still probing availability
	const [available, setAvailable] = useState<boolean | null>(null)

	const probe = useCallback(async () => {
		const url = config.updates.checkUrl
		if (!url) {
			setAvailable(false)
			return
		}
		const controller = new AbortController()
		const timer = setTimeout(() => controller.abort(), config.api.timeout)
		try {
			const res = await fetch(url, { method: 'HEAD', signal: controller.signal })
			setAvailable(res.ok)
		} catch (err) {
			log({ level: 'warn', label: 'HeaderUpdatesRefreshButton', message: 'Update check endpoint unreachable', error: err })
			setAvailable(false)
		} finally {
			clearTimeout(timer)
		}
	}, [])

	useEffect(() => {
		probe()
	}, [probe])

	const handlePress = useCallback(async () => {
		if (isRefreshing || disabled) return
		if (available === false) {
			// Endpoint was unreachable: retry the probe instead of a doomed check
			await probe()
			return
		}
		if (available && onRefresh) {
			await onRefresh()
		}
	}, [available, isRefreshing, disabled, onRefresh, probe])

	const showOffline = available === false
	const showSpinner = available === null || isRefreshing
	const isDisabled = showSpinner || showOffline || disabled
	const icon = showOffline ? 'cloud-offline' : 'refresh'
	const iconType = showOffline ? 'ionicons' : 'material'
	const iconColor = showOffline ? colors.error : colors.primary

	return (
		<HeaderIconBaseButton
			icon={icon}
			iconType={iconType}
			label={showOffline ? 'Updates unavailable' : 'Check for updates'}
			onPress={handlePress}
			disabled={isDisabled}
			loading={showSpinner}
			iconColor={iconColor}
			size={size}
		/>
	)
}

export default HeaderUpdatesRefreshButton
