import React, { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useUpdates, isVersionGreater } from '@/features/updates'
import { config } from '@/config'

export default function Index() {
	const router = useRouter()
	const { latestRelease } = useUpdates()

	useEffect(() => {
		if (Platform.OS === 'android' && latestRelease) {
			const hasNewerRelease = isVersionGreater(latestRelease.latest_version, config.app.version)
			if (hasNewerRelease) {
				router.replace('/updates' as any)
				return
			}
		}
		router.replace('/(home)/feed' as any)
	}, [router, latestRelease])

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
