import { useEffect } from 'react'
import { useRouter } from 'expo-router'

export default function Index() {
	const router = useRouter()

	useEffect(() => {
		router.replace('/(home)/feed' as any)
	}, [router])

	return null
}
