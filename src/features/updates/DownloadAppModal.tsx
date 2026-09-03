import { useCallback, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { SmartModal } from '@/core/smart-modal'
import { translate } from '@/core/translation'
import { setItem } from '@/core/storage'
import { DownloadButton } from '@/features/common/buttons/DownloadButton'
import { CancelButton } from '@/features/common/buttons/CancelButton'
import { EyeButton } from '@/features/common/buttons/EyeButton'
import type { UpdateCheckResult } from './types'

export const DOWNLOAD_APP_MODAL_DISMISSED_KEY = 'web_update_modal_dismissed'

export interface DownloadAppModalProps {
	visible: boolean
	release: UpdateCheckResult | null
	onClose: () => void
}

const styles = StyleSheet.create({
	actionRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 16
	},
	iconButton: {
		height: 56,
		minWidth: 56,
		flex: 0
	}
})

export function DownloadAppModal({ visible, release, onClose }: DownloadAppModalProps) {
	const [dontShowAgain, setDontShowAgain] = useState(false)

	const handleClose = useCallback(async () => {
		if (dontShowAgain) {
			await setItem(DOWNLOAD_APP_MODAL_DISMISSED_KEY, true)
		}
		onClose()
	}, [dontShowAgain, onClose])

	return (
		<SmartModal
			visible={visible}
			onClose={handleClose}
			icon="logo-android"
			title={translate('download_app', 'Download App')}
			message={release ? `drinaluza-${release.latest_version}.apk` : undefined}
			footer={
				<View style={styles.actionRow}>
					<EyeButton
						onPress={() => setDontShowAgain((prev) => !prev)}
						visible={dontShowAgain}
						label={translate('dont_show_again', "Don't show again")}
						accessibilityRole="checkbox"
						accessibilityState={{ checked: dontShowAgain }}
					/>
					<CancelButton onPress={handleClose} style={styles.iconButton} />
					<DownloadButton downloadUrl={release?.download_url} onAfterDownload={handleClose} variant="primary" style={styles.iconButton} />
				</View>
			}
		/>
	)
}
