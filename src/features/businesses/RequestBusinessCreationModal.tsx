import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { BaseModal } from '@/core/ui/modals'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { CancelButton } from '@/core/ui/buttons/CancelButton'
import { ConfirmButton } from '@/core/ui/buttons/ConfirmButton'
import MultiLingualInput from '@/core/ui/languages/MultiLingualInput'
import type { MultiLang } from '@/core/ui/languages/languages.types'

export interface RequestBusinessCreationModalProps {
	visible: boolean
	onClose: () => void
	onSubmit: (name: MultiLang) => Promise<void> | void
	loading?: boolean
}

export function RequestBusinessCreationModal({ visible, onClose, onSubmit, loading = false }: RequestBusinessCreationModalProps) {
	const { colors } = useTheme()
	const [businessName, setBusinessName] = useState<MultiLang>({ en: '', tn_latn: '', tn_arab: '' })

	useEffect(() => {
		if (visible) {
			setBusinessName({ en: '', tn_latn: '', tn_arab: '' })
		}
	}, [visible])

	const handleSubmit = useCallback(async () => {
		if (!businessName.en.trim()) return
		await onSubmit(businessName)
		onClose()
	}, [businessName, onSubmit, onClose])

	const buttons: ReactNode[] = [
		<CancelButton key="cancel" onPress={onClose} disabled={loading} />,
		<ConfirmButton key="submit" onPress={handleSubmit} disabled={loading || !businessName.en.trim()} loading={loading} />
	]

	return (
		<BaseModal
			visible={visible}
			onClose={onClose}
			variant="centered"
			icon="briefcase"
			title={translate('create_business', 'Create Business')}
			subtitle={translate('enter_business_name', 'Enter a name for your business in multiple languages')}
			scrollable
			buttons={buttons}
		>
			<MultiLingualInput
				nameEn={businessName.en}
				setNameEn={(text) => setBusinessName((prev) => ({ ...prev, en: text }))}
				nameTnLatn={businessName.tn_latn}
				setNameTnLatn={(text) => setBusinessName((prev) => ({ ...prev, tn_latn: text }))}
				nameTnArab={businessName.tn_arab}
				setNameTnArab={(text) => setBusinessName((prev) => ({ ...prev, tn_arab: text }))}
			/>
		</BaseModal>
	)
}

export default RequestBusinessCreationModal
