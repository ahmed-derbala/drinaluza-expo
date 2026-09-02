import React from 'react'
import { ScrollView, type StyleProp, type ViewStyle, Platform, View } from 'react-native'

export interface ScrollbarProps {
	/** Whether to show horizontal scrollbar (default: false) */
	horizontal?: boolean
	/** Whether to show vertical scrollbar (default: false) */
	vertical?: boolean
	/** Optional container style override */
	style?: StyleProp<ViewStyle>
	/** Optional content container style override */
	contentContainerStyle?: StyleProp<ViewStyle>
	/** Whether to enable bouncing */
	bounces?: boolean
	/** Overscroll mode */
	overScrollMode?: 'always' | 'never' | 'auto'
	/** Whether keyboard should persist taps */
	keyboardShouldPersistTaps?: 'always' | 'never' | 'handled'
	/** Children */
	children?: React.ReactNode
}

export const Scrollbar = React.memo(function Scrollbar({
	horizontal = false,
	vertical = false,
	style,
	contentContainerStyle,
	bounces,
	overScrollMode,
	keyboardShouldPersistTaps,
	children
}: ScrollbarProps) {
	if (Platform.OS === 'web' && horizontal) {
		return (
			<View
				style={[
					style,
					{
						overflowX: 'auto',
						overflowY: 'hidden',
						display: 'flex',
						flexDirection: 'row',
						width: '100%',
						maxWidth: '100%'
					} as any
				]}
			>
				<View
					style={[
						contentContainerStyle,
						{
							display: 'flex',
							flexDirection: 'row',
							alignItems: 'center',
							gap: 12,
							flexWrap: 'nowrap'
						} as any
					]}
				>
					{children}
				</View>
			</View>
		)
	}

	return (
		<ScrollView
			horizontal={horizontal}
			showsHorizontalScrollIndicator={horizontal}
			showsVerticalScrollIndicator={vertical}
			bounces={bounces}
			overScrollMode={overScrollMode}
			keyboardShouldPersistTaps={keyboardShouldPersistTaps}
			style={style}
			contentContainerStyle={contentContainerStyle}
		>
			{children}
		</ScrollView>
	)
})

export default Scrollbar
