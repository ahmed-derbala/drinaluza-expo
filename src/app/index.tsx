import React, { useEffect, useState } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useUpdates } from '@/core/updates'

export default function Index() {
	const router = useRouter()
	const { startupCheck, installUpdate } = useUpdates()
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		let active = true

		const runCheck = async () => {
			try {
				const decision = await startupCheck()
				if (!active) return

				if (decision.action === 'INSTALL_CACHED') {
					// Redirect to feed in case they cancel/close the installer
					router.replace('/(home)/feed')
					// Trigger installer slightly after redirect to prevent navigation race conditions
					setTimeout(() => {
						installUpdate()
					}, 300)
				} else if (decision.action === 'SHOW_UPDATES_REQUIRED' || decision.action === 'SHOW_UPDATES_OPTIONAL') {
					router.replace('/updates')
				} else {
					router.replace('/(home)/feed')
				}
			} catch (err) {
				if (active) {
					router.replace('/(home)/feed')
				}
			} finally {
				if (active) {
					setLoading(false)
				}
			}
		}

		runCheck()

		return () => {
			active = false
		}
	}, [startupCheck, installUpdate, router])

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
