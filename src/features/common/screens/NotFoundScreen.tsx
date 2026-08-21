import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useTheme } from '@/core/theme'
import ErrorBlock from '@/core/error/ErrorBlock'
import { SmartHeader } from '@/core/smart-header'
import { translate } from '@/core/translation'

export default function NotFoundScreen() {
	const { colors } = useTheme()

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<SmartHeader title={translate('error', 'Error')} fallbackRoute="/feed" />
			<ErrorBlock />
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	}
})
