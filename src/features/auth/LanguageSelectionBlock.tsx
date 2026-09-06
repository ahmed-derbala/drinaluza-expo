/**
 * LanguageSelectionBlock — app language picker for the auth screen.
 *
 * Purpose: horizontally centered row of language chips rendered at the
 * top of the auth form. Presentational only; selection state lives
 * in the parent screen.
 */
import React, { useMemo } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme, type ThemeColors } from '@theme'
import { LanguageIcon, LANGUAGES } from '@ui/languages'

interface LanguageSelectionBlockProps {
	appLang: string
	onSelectLang: (langCode: string) => void
	style?: StyleProp<ViewStyle>
}

const LanguageSelectionBlock: React.FC<LanguageSelectionBlockProps> = ({ appLang, onSelectLang, style }) => {
	const { colors } = useTheme()
	const styles = useMemo(() => createStyles(colors), [colors])

	return (
		<View style={[styles.section, style]}>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} keyboardShouldPersistTaps="handled">
				{LANGUAGES.map((lang) => {
					const selected = appLang === lang.code
					return (
						<TouchableOpacity
							key={lang.code}
							style={[styles.chip, { borderColor: colors.border }, selected && styles.chipActive]}
							onPress={() => onSelectLang(lang.code)}
							activeOpacity={0.75}
							accessibilityLabel={lang.label}
							accessibilityRole="button"
						>
							<LanguageIcon code={lang.code} size={18} />
						</TouchableOpacity>
					)
				})}
			</ScrollView>
		</View>
	)
}

const createStyles = (colors: ThemeColors) =>
	StyleSheet.create({
		section: {
			alignItems: 'center',
			marginBottom: 20
		},
		row: {
			flexGrow: 1,
			flexDirection: 'row',
			justifyContent: 'center',
			gap: 8,
			paddingVertical: 2
		},
		chip: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 4,
			paddingHorizontal: 10,
			paddingVertical: 6,
			borderRadius: 20,
			borderWidth: 1,
			backgroundColor: 'transparent'
		},
		chipActive: {
			borderWidth: 2,
			borderColor: colors.primary,
			backgroundColor: colors.primaryContainer40
		}
	})

export default React.memo(LanguageSelectionBlock)
