import React, { useState } from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BaseCard } from '@/features/common/cards/BaseCard'
import { ResetAppButton } from '@/features/common/buttons/ResetAppButton'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { toast } from '@/features/common/Toast'
import { showConfirm } from '@/core/helpers/popup'
import { clearAllStorage } from '@/core/storage'
import { clearMemoryCache } from '@/core/cache'
import { clearVideoCache } from '@/core/cache/video'
import { useUser } from '@/core/contexts/UserContext'
import { useRouter } from 'expo-router'
import { log } from '@/core/log'
import * as FileSystem from 'expo-file-system/legacy'
import { Platform } from 'react-native'

export function ResetAppCard() {
	const { colors } = useTheme()
	const { refreshUser } = useUser()
	const router = useRouter()
	const [loading, setLoading] = useState(false)

	const handleReset = () => {
		showConfirm(translate('reset_app', 'Reset App'), translate('reset_app_confirm', 'Are you sure you want to reset the app? This will clear all data.'), async () => {
			try {
				setLoading(true)
				await clearAllStorage()
				clearMemoryCache()
				try {
					await clearVideoCache()
				} catch {}
				if (Platform.OS !== 'web' && FileSystem.cacheDirectory) {
					try {
						const files = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory)
						for (const file of files) {
							try {
								await FileSystem.deleteAsync(FileSystem.cacheDirectory + file, { idempotent: true })
							} catch {}
						}
					} catch {}
				}
				if (Platform.OS !== 'web' && FileSystem.documentDirectory) {
					try {
						const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory)
						for (const file of files) {
							try {
								await FileSystem.deleteAsync(FileSystem.documentDirectory + file, { idempotent: true })
							} catch {}
						}
					} catch {}
				}
				await refreshUser().catch(() => {})
				toast.show({
					title: translate('reset_success', 'App reset successfully.'),
					content: '',
					borderColor: colors.success
				})
				router.replace('/auth' as any)
			} catch (error) {
				log({ level: 'error', label: 'ResetAppCard', message: 'Failed to reset app', error })
				toast.show({
					title: translate('error', 'Reset Failed'),
					content: translate('reset_failed', 'Failed to reset app.'),
					borderColor: colors.error
				})
			} finally {
				setLoading(false)
			}
		})
	}

	return (
		<BaseCard title={translate('reset_app', 'Reset App')} iconName="trash-outline" backgroundColor={colors.background} borderColor={colors.error + '30'} style={styles.card}>
			<View style={styles.container}>
				<View style={[styles.warningBox, { backgroundColor: colors.error + '12', borderColor: colors.error + '30' }]}>
					<Ionicons name="warning-outline" size={18} color={colors.error} />
					<Text style={[styles.warningText, { color: colors.textSecondary }]}>{translate('reset_app_confirm', 'Are you sure you want to reset the app? This will clear all data.')}</Text>
				</View>

				<ResetAppButton onPress={handleReset} loading={loading} style={styles.resetButton} />
			</View>
		</BaseCard>
	)
}

const styles = StyleSheet.create({
	card: {
		marginBottom: 20
	},
	container: {
		gap: 16
	},
	warningBox: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 10,
		padding: 12,
		borderRadius: 10,
		borderWidth: 1
	},
	warningText: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '500'
	},
	resetButton: {
		width: '100%'
	}
})

export default ResetAppCard
