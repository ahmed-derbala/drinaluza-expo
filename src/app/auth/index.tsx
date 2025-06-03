import { View, Text, TextInput, Button, StyleSheet } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { useTheme } from '@/core/theme'

export default function AuthScreen() {
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const router = useRouter()
	const { themeStyles } = useTheme()

	const handleSignIn = async () => {
		try {
			const response = await axios.post('http://192.168.1.15:5001/api/auth/signin', {
				username,
				password
			})
			await AsyncStorage.setItem('authToken', response.data.data.token)
			router.replace('/home')
		} catch (error) {
			console.error('Sign-in error:', error)
			alert('Sign-in failed')
		}
	}

	const handleSignUp = async () => {
		try {
			const response = await axios.post('http://192.168.1.15:5001/api/auth/signup', {
				username,
				password
			})
			await AsyncStorage.setItem('authToken', response.data.data.token)
			router.replace('/home')
		} catch (error) {
			console.error('Sign-up error:', error)
			alert('Sign-up failed')
		}
	}

	return (
		<View style={[styles.container, themeStyles.background]}>
			<Text style={[styles.title, themeStyles.text]}>Drinaluza</Text>
			<TextInput style={[styles.input, themeStyles.input]} placeholder="Username" placeholderTextColor={themeStyles.input.placeholderTextColor} value={username} onChangeText={setUsername} />
			<TextInput
				style={[styles.input, themeStyles.input]}
				placeholder="Password"
				placeholderTextColor={themeStyles.input.placeholderTextColor}
				value={password}
				onChangeText={setPassword}
				secureTextEntry
			/>
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
		alignItems: 'center',
		padding: 20
	},
	title: {
		fontSize: 24,
		marginBottom: 20
	},
	input: {
		width: '100%',
		padding: 10,
		marginVertical: 10,
		borderWidth: 1,
		borderRadius: 5
	},
	buttonContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%',
		marginTop: 20
	}
})
