import { View, StyleSheet } from 'react-native'
import { useTheme } from '@theme'
import ErrorBlock from '@error/ErrorBlock'
import { SmartHeader } from '@smart-header'
import { translate } from '@translation'

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
