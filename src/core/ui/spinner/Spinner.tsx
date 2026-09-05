import React from 'react'
import { View, ActivityIndicator, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { useTheme } from '@theme'

export interface SpinnerProps {
	/** Size of the loading spinner. Defaults to 'large'. */
	size?: 'small' | 'large'
	/** When true (default), fills available space with flex:1. Set to false for inline use. */
	expand?: boolean
	/** Custom style for the container. */
	style?: StyleProp<ViewStyle>
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'large', expand = true, style }) => {
	const { colors } = useTheme()

	return (
		<View style={[styles.container, expand && styles.expand, style]}>
			<ActivityIndicator size={size} color={colors.primary} />
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20
	},
	expand: {
		flex: 1,
		padding: 40
	}
})

export default React.memo(Spinner)
