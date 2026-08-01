import React from 'react'
import { View, Platform } from 'react-native'
import { SmartKebabMenu } from '@/core/smart-kebab-menu'
import HeaderActionButton from './HeaderActionButton'
import HeaderRefreshButton from './HeaderRefreshButton'
import HeaderSearchButton from './HeaderSearchButton'
import HeaderNotificationsButton from './HeaderNotificationsButton'
import HeaderCartButton from './HeaderCartButton'

export type HeaderActionType =
	| 'search'
	| 'notifications'
	| 'cart'
	| 'refresh'
	| 'scanner'
	| { key: string; iconName: string; iconType?: string; badgeCount?: number; onPress?: () => void; accessibilityLabel?: string; size?: number; isRefreshing?: boolean; isOffline?: boolean }

type HeaderActionsProps = {
	resolvedHeaderRight?: React.ReactNode
	resolvedActions: (HeaderActionType | React.ReactNode)[]
	options?: any
}

const HeaderActions: React.FC<HeaderActionsProps> = ({ resolvedHeaderRight, resolvedActions, options }) => {
	const resolveHeaderAction = (action: HeaderActionType | React.ReactNode, index: number) => {
		if (React.isValidElement(action)) {
			return React.cloneElement(action as React.ReactElement, { key: `custom-action-${index}` })
		}

		if (typeof action === 'string') {
			switch (action) {
				case 'search':
					return <HeaderSearchButton key="predefined-search" />
				case 'notifications':
					return <HeaderNotificationsButton key="predefined-notifications" />
				case 'cart':
					return <HeaderCartButton key="predefined-cart" />
				case 'refresh':
					return <HeaderRefreshButton key="predefined-refresh" onRefresh={options?.onRefresh} isRefreshing={options?.isRefreshing} isOffline={options?.isOffline} />
				case 'scanner':
					if (Platform.OS === 'web') return null
					return (
						<HeaderActionButton
							key="predefined-scanner"
							iconName="qr-code-scanner"
							iconType="material"
							onPress={() => {
								if (typeof options?.onScannerPress === 'function') {
									options.onScannerPress()
								}
							}}
							accessibilityLabel="Scan QR Code"
						/>
					)
				default:
					return null
			}
		}

		if (action && typeof action === 'object' && 'key' in action) {
			const config = action as any
			if (config.key === 'refresh') {
				return <HeaderRefreshButton key={config.key} onRefresh={config.onPress} isRefreshing={config.isRefreshing} isOffline={config.isOffline} />
			}
			return (
				<HeaderActionButton
					key={config.key}
					iconName={config.iconName}
					iconType={config.iconType || 'ionicons'}
					badgeCount={config.badgeCount}
					onPress={config.onPress}
					accessibilityLabel={config.accessibilityLabel}
					size={config.size}
				/>
			)
		}

		return null
	}

	return (
		<View
			style={{
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'flex-end',
				width: 180,
				flexShrink: 0,
				flexGrow: 0,
				zIndex: 2,
				minHeight: 38,
				gap: 8
			}}
		>
			{resolvedHeaderRight}
			{resolvedActions.map((action, idx) => resolveHeaderAction(action, idx))}
			<SmartKebabMenu />
		</View>
	)
}

export default HeaderActions
