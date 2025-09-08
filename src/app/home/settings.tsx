import React from 'react'
import { View, Text, Button } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { useRouter } from 'expo-router'
import { signOut } from '@/core/auth/auth.api'
import { useTheme } from '@/contexts/ThemeContext'
import { createThemedStyles, commonThemedStyles } from '@/core/theme/createThemedStyles'
import { Theme } from '@/components/settings/settings.interface'

export default function SettingsScreen() {
	const { theme, colors, setTheme } = useTheme()
	const router = useRouter()

	const styles = createThemedStyles((colors) => ({
		...commonThemedStyles(colors),
		container: {
			flex: 1,
			padding: 20,
			backgroundColor: colors.background
		},
		title: {
			fontSize: 24,
			fontWeight: 'bold',
			color: colors.text,
			marginBottom: 20
		},
		label: {
			fontSize: 16,
			color: colors.text,
			marginBottom: 10
		},
		picker: {
			backgroundColor: colors.input,
			color: colors.text,
			marginBottom: 20
		},
		button: {
			marginTop: 20
		}
	}))(colors)

	const handleThemeChange = async (newTheme: Theme) => {
		await setTheme(newTheme)
	}

	const handleSignOut = async () => {
		try {
			await signOut()
			router.replace('/auth')
		} catch (error) {
			console.error('Sign out failed:', error)
			// Even if signout fails, try to navigate to auth screen
			// as the user should be logged out locally
			router.replace('/auth')
		}
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Settings</Text>

			{/* Theme Section */}
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
