import { View, Text, Button, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { useTheme } from '@/core/theme'
import { useSettings } from '@/components/settings/settings.service'

export default function SettingsScreen() {
	const router = useRouter()
	const { theme, setTheme, themeStyles } = useTheme()
	const { handleSignOut } = useSettings()

	const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
		setTheme(newTheme)
	}

	const signOut = async () => {
		await handleSignOut()
		router.replace('/auth')
	}

	return (
		<View style={[styles.container, themeStyles.background]}>
			<Text style={[styles.title, themeStyles.text]}>Settings</Text>
			<View style={styles.section}>
				<Text style={[styles.sectionTitle, themeStyles.text]}>Theme</Text>
				<View style={styles.buttonGroup}>
					<Button title="Light" onPress={() => handleThemeChange('light')} disabled={theme === 'light'} />
					<Button title="Dark" onPress={() => handleThemeChange('dark')} disabled={theme === 'dark'} />
					<Button title="System" onPress={() => handleThemeChange('system')} disabled={theme === 'system'} />
				</View>
			</View>
			<View style={styles.section}>
				<Button title="Sign Out" onPress={signOut} />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20
	},
	title: {
		fontSize: 24,
		marginBottom: 20
	},
	section: {
		marginVertical: 20
	},
	sectionTitle: {
		fontSize: 18,
		marginBottom: 10
	},
	buttonGroup: {
		flexDirection: 'row',
		justifyContent: 'space-between'
	}
})
