import React, { useEffect, useState } from 'react'
import { View, Text, Button, StyleSheet, Appearance } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { useRouter } from 'expo-router'
import { signOut } from '@/core/auth/auth.api'
import { getTheme, setTheme, Theme } from '@/components/settings/settings.api'

export default function SettingsScreen() {
	const [theme, setThemeState] = useState<Theme>('dark')
	const router = useRouter()

	useEffect(() => {
		const loadTheme = async () => {
			const savedTheme = await getTheme()
			setThemeState(savedTheme)
			applyTheme(savedTheme)
		}
		loadTheme()
	}, [])

	const applyTheme = (theme: Theme) => {
		// In a real app, you'd implement theme switching logic here
		// For simplicity, we're just storing the preference
		if (theme === 'system') {
			const systemTheme = Appearance.getColorScheme()
			// Apply system theme
		}
	}

	const handleThemeChange = async (newTheme: Theme) => {
		setThemeState(newTheme)
		await setTheme(newTheme)
		applyTheme(newTheme)
	}

	const handleSignOut = async () => {
		try {
			await signOut()
			router.replace('/auth')
		} catch (error) {
			console.error('Sign out failed:', error)
		}
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Settings</Text>
			<Text style={styles.label}>Theme</Text>
			<Picker selectedValue={theme} style={styles.picker} onValueChange={(value: Theme) => handleThemeChange(value)}>
				<Picker.Item label="Dark" value="dark" />
				<Picker.Item label="Light" value="light" />
				<Picker.Item label="System" value="system" />
			</Picker>
			<View style={styles.button}>
				<Button title="Sign Out" onPress={handleSignOut} />
			</View>
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
		marginBottom: 10
	},
	picker: {
		backgroundColor: '#333',
		color: '#fff',
		marginBottom: 20
	},
	button: {
		marginTop: 20
	}
})
