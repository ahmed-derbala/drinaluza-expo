import React, { useState, useCallback } from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BaseCard } from '@/features/common/cards/BaseCard'
import { ResetAppButton } from '@/features/common/buttons/ResetAppButton'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { toast } from '@/features/common/Toast'
import { showConfirm } from '@/core/helpers/popup'
import { clearAllStorage } from '@/core/storage'
import { clearMemoryCache } from '@/core/cache/store'
import { clearDirectory, getCacheDirectory, getDocumentDirectory } from '@/core/disk'
import { useUser } from '@/core/contexts/UserContext'
import { useRouter } from 'expo-router'
import { log } from '@/core/log'

export function ResetAppCard() {
	const { colors } = useTheme()
	const { refreshUser } = useUser()
	const router = useRouter()
	const [loading, setLoading] = useState(false)

	const handleReset = useCallback(() => {
		showConfirm(translate('reset_app', 'Reset App'), translate('reset_app_confirm', 'Are you sure you want to reset the app? This will clear all data.'), async () => {
			try {
				setLoading(true)
				await clearAllStorage()
				clearMemoryCache()
				// clearAllStorage already wipes AsyncStorage (including video resume keys),
				// but we also need to wipe the filesystem caches
				await Promise.all([clearDirectory(getCacheDirectory()), clearDirectory(getDocumentDirectory())])
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
	}, [colors.error, colors.success, refreshUser, router])

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
