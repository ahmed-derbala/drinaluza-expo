import React from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { useTheme } from '@/core/theme'

export interface LoadingStateProps {
	/**
	 * Size of the loading spinner. Defaults to 'large'.
	 */
	size?: 'small' | 'large'
	/**
	 * Optional custom color indicator. Defaults to colors.primary.
	 */
	color?: string
	/**
	 * Custom style for the centered container.
	 */
	style?: object
}

const LoadingState: React.FC<LoadingStateProps> = ({ size = 'large', color, style }) => {
	const { colors } = useTheme()

	return (
		<View style={[styles.container, style]}>
			<ActivityIndicator size={size} color={color || colors.primary} />
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 40
	}
})

export default React.memo(LoadingState)
