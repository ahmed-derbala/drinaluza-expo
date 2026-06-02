import { useContext } from 'react'
import { UpdatesContext } from './UpdatesContext'

export const useUpdates = () => {
	const context = useContext(UpdatesContext)
	if (!context) {
		throw new Error('useUpdates must be used within an UpdatesProvider')
	}
	return context
}
