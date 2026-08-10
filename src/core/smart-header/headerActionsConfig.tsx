import React from 'react'
import { HeaderCartButton, HeaderNotificationsButton, HeaderRefreshButton } from './buttons'

export type HeaderActionType = React.ReactNode

interface DefaultHeaderAction {
	key: string
	render: () => React.ReactNode
}

/**
 * Header buttons shown on every screen, ordered from rightmost (index 0)
 * to leftmost (closest to the title). To add a new default button, add an
 * entry here — nothing else needs to change. To reorder them, reorder this
 * array.
 */
export const DEFAULT_HEADER_ACTIONS: DefaultHeaderAction[] = [
	{ key: 'refresh', render: () => <HeaderRefreshButton key="refresh" /> },
	{ key: 'notifications', render: () => <HeaderNotificationsButton key="notifications" /> },
	{ key: 'cart', render: () => <HeaderCartButton key="cart" /> }
]

function getActionKey(action: React.ReactNode): string | undefined {
	return React.isValidElement(action) && action.key != null ? String(action.key) : undefined
}

/**
 * Merges the actions a screen wants to show with the defaults above:
 * - A screen action whose `key` matches a default (e.g. `key="refresh"`)
 *   replaces that default in place, so screens can customize a default
 *   button (e.g. its `onRefresh`) without duplicating or reordering it.
 * - Any other screen action is treated as extra and rendered to the left
 *   of the default buttons.
 *
 * The default buttons always render as a group on the right (right before
 * the kebab menu), in the order defined by `DEFAULT_HEADER_ACTIONS`.
 */
export function resolveHeaderActions(screenActions: HeaderActionType[] = []): React.ReactNode[] {
	const defaultKeys = new Set(DEFAULT_HEADER_ACTIONS.map((action) => action.key))
	const overridesByKey = new Map<string, React.ReactNode>()
	const extraActions: React.ReactNode[] = []

	for (const action of screenActions) {
		const key = getActionKey(action)
		if (key && defaultKeys.has(key)) {
			overridesByKey.set(key, action)
		} else {
			extraActions.push(action)
		}
	}

	const defaultActions = [...DEFAULT_HEADER_ACTIONS].reverse().map(({ key, render }) => overridesByKey.get(key) ?? render())

	return [...extraActions, ...defaultActions]
}
