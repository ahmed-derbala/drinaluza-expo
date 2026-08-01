import React from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { IconButton } from '@/features/common/buttons/IconButton'
import { useTheme, colors as themeColors } from '@/core/theme'

export interface HeaderActionButtonProps {
	/**
	 * Glyph name of the icon.
	 */
	iconName: any
	/**
	 * Icon glyph package family. Defaults to 'ionicons'.
	 */
	iconType?: 'ionicons' | 'material'
	/**
	 * Action triggered on press.
	 */
	onPress: () => void
	/**
	 * Optional badge count display.
	 */
	badgeCount?: number
	/**
	 * Accessibility string describing the action.
	 */
	accessibilityLabel: string
	/**
	 * Custom container size override. Defaults to 40.
	 */
	size?: number
}

const HeaderActionButton: React.FC<HeaderActionButtonProps> = ({ iconName, iconType = 'ionicons', onPress, badgeCount = 0, accessibilityLabel, size = 40 }) => {
	const { colors } = useTheme()

	return (
		<View style={styles.buttonContainer}>
			<IconButton
				icon={iconName}
				iconType={iconType}
				label={accessibilityLabel}
				onPress={onPress}
				colors={colors}
				iconColor={colors.primary}
				size={size}
				style={{ backgroundColor: colors.primary + '15', borderColor: 'transparent' }}
			/>

			{badgeCount > 0 && (
				<View
					style={[
						styles.badge,
						{
							backgroundColor: colors.error,
							borderColor: colors.surface,
							top: -Math.round(size * 0.15),
							right: -Math.round(size * 0.15)
						}
					]}
				>
					<Text style={styles.badgeText}>{badgeCount}</Text>
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	buttonContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		position: 'relative'
	},
	badge: {
		position: 'absolute',
		borderRadius: 10,
		minWidth: 18,
		height: 18,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 4,
		borderWidth: 1.5
	},
	badgeText: {
		color: themeColors.buttonText,
		fontSize: 9,
		fontWeight: 'bold'
	}
})

export default React.memo(HeaderActionButton)
