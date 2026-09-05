import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '@theme'
import { getLanguageConfig } from './languages.constants'

interface LanguageIconProps {
	code: string | undefined
	size?: number
	containerStyle?: StyleProp<ViewStyle>
}

export function LanguageIcon({ code, size = 24, containerStyle }: LanguageIconProps) {
	const { colors } = useTheme()
	const config = getLanguageConfig(code)
	if (!config) return null

	return (
		<View style={[styles.container, { width: size + 8, height: size + 8 }, containerStyle]}>
			<Text style={{ fontSize: size }}>{config.flag}</Text>
			{config.letter && (
				<View style={[styles.badge, { backgroundColor: colors.background, borderColor: colors.border }]}>
					<Text style={[styles.badgeText, { color: colors.text }]}>{config.letter}</Text>
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		position: 'relative',
		justifyContent: 'center',
		alignItems: 'center'
	},
	badge: {
		position: 'absolute',
		bottom: -4,
		right: -4,
		width: 16,
		height: 16,
		borderRadius: 8,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	badgeText: {
		fontSize: 10,
		fontWeight: '700'
	}
})

export default LanguageIcon
