import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function ProfileScreen() {
	const [username, setUsername] = useState<string>('')

	useEffect(() => {
		const loadUser = async () => {
			try {
				const storedUsername = await AsyncStorage.getItem('user.username')
				if (storedUsername) setUsername(storedUsername)
			} catch (e) {
				// noop
			}
		}
		loadUser()
	}, [])

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Profile</Text>
			<Text style={styles.label}>Username</Text>
			<Text style={styles.value}>{username || 'Guest'}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
		backgroundColor: '#1a1a1a'
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#fff',
		marginBottom: 20
	},
	label: {
		fontSize: 16,
		color: '#fff',
		marginBottom: 6
	},
	value: {
		fontSize: 18,
		color: '#ddd'
	}
})
