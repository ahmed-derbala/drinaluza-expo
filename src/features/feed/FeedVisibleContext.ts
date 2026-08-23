import React from 'react'

export const VisibleIdsContext = React.createContext<Set<string>>(new Set())
export const ActiveVideoIdContext = React.createContext<string | null>(null)
export const SetActiveVideoIdContext = React.createContext<(id: string | null) => void>(() => {})
