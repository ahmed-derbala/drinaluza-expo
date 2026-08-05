import React from 'react'
import { View, Platform } from 'react-native'
import { SmartKebabMenu } from '@/core/smart-kebab-menu'
import { HeaderIconButton, HeaderRefreshButton, HeaderSearchButton, HeaderCartButton } from './buttons'

export type HeaderActionType =
	| 'search'
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
				case 'cart':
					return <HeaderCartButton key="predefined-cart" />
				case 'refresh':
					return <HeaderRefreshButton key="predefined-refresh" onRefresh={options?.onRefresh} isRefreshing={options?.isRefreshing} isOffline={options?.isOffline} />
				case 'scanner':
					if (Platform.OS === 'web') return null
					return (
						<HeaderIconButton
							key="predefined-scanner"
							icon="qr-code-scanner"
							iconType="material"
							onPress={() => {
								if (typeof options?.onScannerPress === 'function') {
									options.onScannerPress()
								}
							}}
							label="Scan QR Code"
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
				<HeaderIconButton
					key={config.key}
					icon={config.iconName}
					iconType={config.iconType || 'ionicons'}
					badgeCount={config.badgeCount}
					onPress={config.onPress}
					label={config.accessibilityLabel}
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
				flexShrink: 0,
				flexGrow: 0,
				zIndex: 2,
				minHeight: 38,
				gap: 0
			}}
		>
			{resolvedHeaderRight}
			{resolvedActions.map((action, idx) => resolveHeaderAction(action, idx))}
			<SmartKebabMenu />
		</View>
	)
}

export default HeaderActions
