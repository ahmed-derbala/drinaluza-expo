import React, { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'

export default function Index() {
	const router = useRouter()

	useEffect(() => {
		router.replace('/(home)/feed' as any)
	}, [router])

	return null
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#000000',
		justifyContent: 'center',
		alignItems: 'center'
	}
})
