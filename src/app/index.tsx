import React, { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'

export default function Index() {
	const router = useRouter()

	useEffect(() => {
		router.replace('/(home)/feed')
	}, [router])

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
