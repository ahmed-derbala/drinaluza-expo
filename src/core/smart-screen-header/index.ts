import SmartScreenHeaderComponent from './SmartScreenHeader'
import BackButton from './components/BackButton'
import ActionButton from './components/ActionButton'
import Title from './components/Title'
import { RefreshAction, SearchAction, SettingsAction, CartAction } from './presets'

// Export types for custom external usages
export type { SmartScreenHeaderProps, SmartScreenHeaderBackButtonProps, SmartScreenHeaderActionButtonProps, SmartScreenHeaderTitleProps } from './types'

export type { RefreshActionProps, SearchActionProps, SettingsActionProps, CartActionProps } from './presets'

// Bind subcomponents to the main container component (Compound Component pattern)
const SmartScreenHeader = Object.assign(SmartScreenHeaderComponent, {
	BackButton,
	Action: ActionButton,
	Title,
	RefreshAction,
	SearchAction,
	SettingsAction,
	CartAction
})

export default SmartScreenHeader
export { SmartScreenHeader }
export { BackButton, ActionButton, Title, RefreshAction, SearchAction, SettingsAction, CartAction }
export { getSmartHeaderOptions } from './SmartScreenHeader'
