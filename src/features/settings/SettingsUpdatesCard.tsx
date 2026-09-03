import React, { useState, useEffect } from 'react'
import { StyleSheet, View, Text, Switch, Platform, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BaseCard } from '@/features/common/cards/BaseCard'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { useUpdateSettings } from '@/features/settings/UpdateSettingsContext'
import { useUpdates } from '@/features/updates/useUpdates'
import { isAndroid, isWeb } from '@/core/platform'
import { config } from '@/config'
import BottomSheetModal from '@/core/smart-modal/BottomSheetModal'

export function SettingsUpdatesCard() {
	const { colors } = useTheme()
	const { enabled, maxApkKeepCount, setEnabled, setMaxApkKeepCount } = useUpdateSettings()
	const { cleanupApks, refreshApkList } = useUpdates()
	const maxApkCount = config.updates.maxApkInstallersCount
	const [pickerVisible, setPickerVisible] = useState(false)

	useEffect(() => {
		cleanupApks(maxApkKeepCount).then(() => refreshApkList())
	}, [maxApkKeepCount, cleanupApks, refreshApkList])

	const options = Array.from({ length: maxApkCount }, (_, i) => i + 1)

	if (isWeb) return null

	return (
		<BaseCard title={translate('updates_settings', 'Update Settings')} iconName="download-outline" backgroundColor={colors.background} borderColor={colors.border} style={styles.card}>
			<View style={styles.list}>
				<View style={[styles.row, isAndroid ? { borderBottomColor: colors.border } : styles.lastRow]}>
					<View style={[styles.iconWrapper, { backgroundColor: colors.primary + '12' }]}>
						<Ionicons name="sync-outline" size={18} color={colors.primary} />
					</View>
					<View style={styles.texts}>
						<Text style={[styles.title, { color: colors.text }]}>{translate('updates_check', 'Check for Updates')}</Text>
						<Text style={[styles.subtitle, { color: colors.textSecondary }]}>{translate('updates_check_desc', 'Check for updates when the app starts')}</Text>
					</View>
					<Switch
						value={enabled}
						onValueChange={setEnabled}
						trackColor={{ false: colors.border, true: colors.primary }}
						thumbColor={Platform.OS === 'android' ? (enabled ? colors.background : colors.surface) : undefined}
						ios_backgroundColor={colors.border}
						accessibilityLabel={translate('updates_check', 'Check for Updates')}
					/>
				</View>
				{isAndroid && (
					<TouchableOpacity style={[styles.row, styles.lastRow, { borderBottomColor: 'transparent' }]} onPress={() => setPickerVisible(true)} activeOpacity={0.7}>
						<View style={[styles.iconWrapper, { backgroundColor: colors.info + '12' }]}>
							<Ionicons name="layers-outline" size={18} color={colors.info} />
						</View>
						<View style={styles.texts}>
							<Text style={[styles.title, { color: colors.text }]}>{translate('max_apk_installers_keep', 'Keep APK Installers')}</Text>
							<Text style={[styles.subtitle, { color: colors.textSecondary }]}>{translate('max_apk_installers_keep_desc', 'Number of APK installers to keep')}</Text>
						</View>
						<View style={styles.valueRow}>
							<Text style={[styles.valueText, { color: colors.primary }]}>{maxApkKeepCount}</Text>
							<Ionicons name="chevron-down-outline" size={18} color={colors.textSecondary} />
						</View>
					</TouchableOpacity>
				)}
			</View>

			{isAndroid && (
				<BottomSheetModal visible={pickerVisible} onClose={() => setPickerVisible(false)} title={translate('max_apk_installers_keep', 'Keep APK Installers')} closeOnOverlayPress>
					<View style={styles.pickerList}>
						{options.map((n) => (
							<TouchableOpacity
								key={n}
								onPress={() => {
									setMaxApkKeepCount(n)
									setPickerVisible(false)
								}}
								style={[styles.pickerItem, { borderBottomColor: colors.border }, maxApkKeepCount === n && { backgroundColor: colors.primary + '12' }]}
							>
								<Text style={[styles.pickerItemText, { color: maxApkKeepCount === n ? colors.primary : colors.text }]}>{n}</Text>
								{maxApkKeepCount === n ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
							</TouchableOpacity>
						))}
					</View>
				</BottomSheetModal>
			)}
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
	lastRow: {
		borderBottomWidth: 0
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
	},
	valueRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4
	},
	valueText: {
		fontSize: 16,
		fontWeight: '700'
	},
	pickerList: {
		paddingVertical: 8
	},
	pickerItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 16,
		paddingHorizontal: 20,
		borderBottomWidth: StyleSheet.hairlineWidth,
		gap: 12
	},
	pickerItemText: {
		fontSize: 16,
		fontWeight: '500'
	}
})

export default SettingsUpdatesCard
