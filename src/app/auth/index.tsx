import React, { useEffect, useState } from 'react'
import { View, TextInput, Button, StyleSheet, Text } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { signIn, signUp } from '@/core/auth/auth.api'

export default function AuthScreen() {
	const [username, setUsername] = useState('ahmed')
	const [password, setPassword] = useState('123')
	const router = useRouter()

	// 🔒 Check if already authenticated
	useEffect(() => {
		const checkIfAuthenticated = async () => {
			const token = await AsyncStorage.getItem('authToken')
			if (token) {
				router.replace('/home')
			}
		}
		checkIfAuthenticated()
	}, [])

	const handleSignIn = async () => {
		try {
			await signIn(username, password)
			router.replace('/home')
		} catch (error) {
			console.error('Sign in failed:', error)
		}
	}

	const handleSignUp = async () => {
		try {
			await signUp(username, password)
			router.replace('/home')
		} catch (error) {
			console.error('Sign up failed:', error)
		}
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Drinaluza</Text>
			<TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} />
			<TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
			<View style={styles.buttonContainer}>
				<Button title="Sign In" onPress={handleSignIn} />
				<Button title="Sign Up" onPress={handleSignUp} />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		padding: 20,
		backgroundColor: '#1a1a1a'
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#fff',
		marginBottom: 20,
		textAlign: 'center'
	},
	input: {
		borderWidth: 1,
		borderColor: '#444',
		padding: 10,
		marginBottom: 10,
		borderRadius: 5,
		color: '#fff',
		backgroundColor: '#333'
	},
	buttonContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between'
	}
})
