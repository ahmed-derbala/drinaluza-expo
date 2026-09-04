import { useRouter } from 'expo-router'
import { HeaderIconBaseButton } from './HeaderIconBaseButton'

export interface HeaderCreateProductButtonProps {
	businessSlug?: string
	size?: number
	label?: string
}

export function HeaderCreateProductButton({ businessSlug, size = 38, label = 'Create Product' }: HeaderCreateProductButtonProps) {
	const router = useRouter()

	if (!businessSlug) return null

	return <HeaderIconBaseButton icon="add" iconType="material" label={label} onPress={() => router.push(`/dashboard/${businessSlug}/create-product` as any)} size={size} />
}
