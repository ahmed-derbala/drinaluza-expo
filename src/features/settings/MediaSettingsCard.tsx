import React, { memo } from 'react'
import { StyleSheet, View, Text, Switch, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BaseCard } from '@/features/common/cards/BaseCard'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { useMediaSettings } from '@/features/settings/MediaSettingsContext'

interface MediaSettingRowProps {
	icon: keyof typeof Ionicons.glyphMap
	title: string
	subtitle: string
	value: boolean
	onValueChange: (v: boolean) => void
}

const MediaSettingRow = memo(function MediaSettingRow({ icon, title, subtitle, value, onValueChange }: MediaSettingRowProps) {
	const { colors } = useTheme()
	return (
		<View style={[styles.row, { borderBottomColor: colors.border }]}>
			<View style={[styles.iconWrapper, { backgroundColor: colors.primary + '12' }]}>
				<Ionicons name={icon} size={18} color={colors.primary} />
			</View>
			<View style={styles.texts}>
				<Text style={[styles.title, { color: colors.text }]}>{title}</Text>
				<Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
			</View>
			<Switch
				value={value}
				onValueChange={onValueChange}
				trackColor={{ false: colors.border, true: colors.primary }}
				thumbColor={Platform.OS === 'android' ? (value ? colors.background : colors.surface) : undefined}
				ios_backgroundColor={colors.border}
				accessibilityLabel={title}
			/>
		</View>
	)
})

export function MediaSettingsCard() {
	const { colors } = useTheme()
	const { autoAdvance, autoPlay, soundOn, setAutoAdvance, setAutoPlay, setSoundOn } = useMediaSettings()

	return (
		<BaseCard title={translate('media_settings', 'Media Settings')} iconName="play-circle-outline" backgroundColor={colors.background} borderColor={colors.border} style={styles.card}>
			<View style={styles.list}>
				<MediaSettingRow
					icon="albums-outline"
					title={translate('media_auto_advance', 'Auto Advance')}
					subtitle={translate('media_auto_advance_desc', 'Automatically go to next media')}
					value={autoAdvance}
					onValueChange={setAutoAdvance}
				/>
				<MediaSettingRow
					icon="play-outline"
					title={translate('media_auto_play', 'Auto Play')}
					subtitle={translate('media_auto_play_desc', 'Videos start playing automatically')}
					value={autoPlay}
					onValueChange={setAutoPlay}
				/>
				<MediaSettingRow
					icon="volume-high-outline"
					title={translate('media_sound_on', 'Sound On')}
					subtitle={translate('media_sound_on_desc', 'Videos start with sound')}
					value={soundOn}
					onValueChange={setSoundOn}
				/>
			</View>
		</BaseCard>
	)
}

const styles = StyleSheet.create({
	card: {
		marginBottom: 20
	},
	list: {
		gap: 0
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 14,
		borderBottomWidth: 1,
		gap: 12
	},
	iconWrapper: {
		width: 36,
		height: 36,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center'
	},
	texts: {
		flex: 1,
		gap: 2
	},
	title: {
		fontSize: 14,
		fontWeight: '600'
	},
	subtitle: {
		fontSize: 12,
		fontWeight: '400',
		lineHeight: 16
	}
})

export default MediaSettingsCard
