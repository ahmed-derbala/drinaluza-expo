import React from 'react'
import { View } from 'react-native'
import { SmartKebabMenu } from '@/core/smart-kebab-menu'
import { HeaderActionType, resolveHeaderActions } from './headerActionsConfig'

export type { HeaderActionType }

type HeaderActionsProps = {
	headerRight?: React.ReactNode
	headerActions?: HeaderActionType[]
}

const HeaderActions: React.FC<HeaderActionsProps> = ({ headerRight, headerActions }) => {
	const resolvedActions = resolveHeaderActions(headerActions)

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
			{headerRight}
			{resolvedActions.map((action, idx) => (React.isValidElement(action) ? React.cloneElement(action as React.ReactElement, { key: action.key ?? `header-action-${idx}` }) : action))}
			<SmartKebabMenu />
		</View>
	)
}

export default HeaderActions
