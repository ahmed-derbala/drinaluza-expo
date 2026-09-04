import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { BaseModal } from '@/core/ui/modals'
import { translate } from '@/core/translation'
import { setItem } from '@/core/storage'
import { DownloadButton } from '@/core/ui/buttons/DownloadButton'
import { CancelButton } from '@/core/ui/buttons/CancelButton'
import { EyeButton } from '@/core/ui/buttons/EyeButton'
import type { UpdateCheckResult } from './types'

export const DOWNLOAD_APP_MODAL_DISMISSED_KEY = 'web_update_modal_dismissed'

export interface DownloadAndroidAppModalProps {
	visible: boolean
	release: UpdateCheckResult | null
	onClose: () => void
}

export function DownloadAndroidAppModal({ visible, release, onClose }: DownloadAndroidAppModalProps) {
	const [dontShowAgain, setDontShowAgain] = useState(false)

	const handleClose = useCallback(async () => {
		if (dontShowAgain) {
			await setItem(DOWNLOAD_APP_MODAL_DISMISSED_KEY, true)
		}
		onClose()
	}, [dontShowAgain, onClose])

	const buttons: ReactNode[] = [
		<EyeButton
			key="eye"
			onPress={() => setDontShowAgain((prev) => !prev)}
			visible={dontShowAgain}
			label={translate('dont_show_again', "Don't show again")}
			accessibilityRole="checkbox"
			accessibilityState={{ checked: dontShowAgain }}
		/>,
		<CancelButton key="cancel" onPress={handleClose} />,
		<DownloadButton key="download" downloadUrl={release?.download_url} onAfterDownload={handleClose} variant="primary" />
	]

	return (
		<BaseModal
			visible={visible}
			onClose={handleClose}
			icon="logo-android"
			title={translate('download_app', 'Download App')}
			message={release ? `drinaluza-${release.latest_version}.apk` : undefined}
			buttons={buttons}
		/>
	)
}
