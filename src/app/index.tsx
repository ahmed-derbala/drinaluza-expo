import React, { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useUpdates } from '@/core/updates/UpdatesContext'

export default function Index() {
	const router = useRouter()
	const { isCheckingStartup, startupRedirect } = useUpdates()

	useEffect(() => {
		if (!isCheckingStartup) {
			if (startupRedirect) {
				router.replace(startupRedirect as any)
			} else {
				router.replace('/(home)/feed')
			}
		}
	}, [isCheckingStartup, startupRedirect, router])

	return (
		<View style={styles.container}>
			<ActivityIndicator size="large" color="#0EA5E9" />
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#000000',
		justifyContent: 'center',
		alignItems: 'center'
	}
})
