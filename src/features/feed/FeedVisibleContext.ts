import React from 'react'

export interface FeedFocusState {
	focusedId: string | null
	activeVideoId: string | null
	visibleIds: Set<string>
	setFocusedId: (id: string | null) => void
	setActiveVideoId: (id: string | null) => void
}

export const FeedFocusContext = React.createContext<FeedFocusState>({
	focusedId: null,
	activeVideoId: null,
	visibleIds: new Set(),
	setFocusedId: () => {},
	setActiveVideoId: () => {}
})
