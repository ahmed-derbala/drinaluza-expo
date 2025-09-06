import React, { useEffect, useState } from 'react'
import { View, TextInput, Button, StyleSheet, Text, TouchableOpacity, Modal, Alert } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { signIn, signUp } from '@/core/auth/auth.api'
import { getServerConfig, setServerConfig, addLocalServer } from '@/components/settings/settings.api'
import { ServerMode, ServerConfig } from '@/components/settings/settings.interface'
import { updateApiBaseUrl } from '@/core/api'
import { useTheme } from '@/contexts/ThemeContext'
import { createThemedStyles, commonThemedStyles } from '@/core/theme/createThemedStyles'

export default function AuthScreen() {
	const { colors, isDark } = useTheme()
	const [username, setUsername] = useState('ahmed')
	const [password, setPassword] = useState('123')
	const [showServerSettings, setShowServerSettings] = useState(false)
	const [serverConfig, setServerConfigState] = useState<ServerConfig>({ mode: 'local', customUrl: '192.168.1.15', localServers: [] })
	const [customUrl, setCustomUrl] = useState('192.168.1.15')
	const router = useRouter()

	const styles = createThemedStyles((colors) => ({
		...commonThemedStyles(colors),
		container: {
			flex: 1,
			justifyContent: 'center',
			padding: 20,
			backgroundColor: colors.background
		},
		title: {
			fontSize: 24,
			fontWeight: 'bold',
			color: colors.text,
			marginBottom: 20,
			textAlign: 'center'
		},
		input: {
			borderWidth: 1,
			borderColor: colors.inputBorder,
			padding: 10,
			marginBottom: 10,
			borderRadius: 5,
			color: colors.text,
			backgroundColor: colors.input
		},
		buttonContainer: {
			flexDirection: 'row',
			justifyContent: 'space-between'
		},
		serverSettingsButton: {
			position: 'absolute',
			top: 50,
			right: 20,
			width: 40,
			height: 40,
			borderRadius: 20,
			backgroundColor: colors.surface,
			justifyContent: 'center',
			alignItems: 'center',
			borderWidth: 1,
			borderColor: colors.border
		},
		serverSettingsButtonText: {
			fontSize: 20
		},
		modalOverlay: {
			flex: 1,
			backgroundColor: colors.modalOverlay,
			justifyContent: 'center',
			alignItems: 'center'
		},
		modalContent: {
			backgroundColor: colors.modal,
			borderRadius: 10,
			padding: 20,
			width: '90%',
			maxWidth: 400,
			borderWidth: 1,
			borderColor: colors.border
		},
		modalTitle: {
			fontSize: 20,
			fontWeight: 'bold',
			color: colors.text,
			marginBottom: 20,
			textAlign: 'center'
		},
		modalLabel: {
			fontSize: 16,
			color: colors.text,
			marginBottom: 10
		},
		modalPicker: {
			backgroundColor: colors.input,
			color: colors.text,
			marginBottom: 20
		},
		inputContainer: {
			marginBottom: 20
		},
		inputLabel: {
			fontSize: 14,
			color: colors.text,
			marginBottom: 8
		},
		textInput: {
			backgroundColor: colors.input,
			color: colors.text,
			borderRadius: 8,
			padding: 12,
			fontSize: 16,
			borderWidth: 1,
			borderColor: colors.inputBorder
		},
		modalButtonContainer: {
			flexDirection: 'row',
			justifyContent: 'space-between'
		},
		addButton: {
			backgroundColor: colors.accent,
			padding: 12,
			borderRadius: 8,
			alignItems: 'center',
			marginVertical: 8
		},
		addButtonText: {
			color: colors.buttonText,
			fontSize: 16,
			fontWeight: '600'
		},
		clearStorageContainer: {
			marginTop: 20,
			paddingTop: 20,
			borderTopWidth: 1,
			borderTopColor: colors.border,
			alignItems: 'center'
		},
		clearStorageButton: {
			backgroundColor: '#ff4444',
			padding: 12,
			borderRadius: 8,
			alignItems: 'center',
			marginBottom: 8,
			minWidth: 200
		},
		clearStorageButtonText: {
			color: '#ffffff',
			fontSize: 16,
			fontWeight: '600'
		},
		clearStorageDescription: {
			color: colors.textSecondary,
			fontSize: 12,
			textAlign: 'center',
			paddingHorizontal: 20
		}
	}))(colors)

	// 🔒 Check if already authenticated
	useEffect(() => {
		const checkIfAuthenticated = async () => {
			const token = await AsyncStorage.getItem('authToken')
			if (token) {
				router.push('/home' as any)
			}
		}
		checkIfAuthenticated()
	}, [])

	// Load server configuration
	useEffect(() => {
		const loadServerConfig = async () => {
			const savedServerConfig = await getServerConfig()
			setServerConfigState(savedServerConfig)
			setCustomUrl(savedServerConfig.customUrl || '192.168.1.15')
		}
		loadServerConfig()
	}, [])

	const handleSignIn = async () => {
		try {
			await signIn(username, password)
			router.push('/home' as any)
		} catch (error) {
			console.error('Sign in failed:', error)
		}
	}

	const handleSignUp = async () => {
		try {
			await signUp(username, password)
			router.push('/home' as any)
		} catch (error) {
			console.error('Sign up failed:', error)
		}
	}

	const handleServerModeChange = async (mode: ServerMode) => {
		const newConfig: ServerConfig = {
			mode,
			customUrl: mode === 'local' ? customUrl : undefined,
			localServers: serverConfig.localServers
		}
		setServerConfigState(newConfig)
		await setServerConfig(newConfig)
		await updateApiBaseUrl()
	}

	const handleCustomUrlChange = async (url: string) => {
		setCustomUrl(url)
		if (serverConfig.mode === 'local') {
			const newConfig: ServerConfig = {
				...serverConfig,
				customUrl: url,
				localServers: serverConfig.localServers
			}
			setServerConfigState(newConfig)
			await setServerConfig(newConfig)
			await updateApiBaseUrl()
		}
	}

	const handleQuickAddServer = async () => {
		if (!customUrl.trim()) {
			Alert.alert('Error', 'Please enter a server URL')
			return
		}

		try {
			await addLocalServer({
				name: `Quick Server ${Date.now()}`,
				url: customUrl.trim(),
				port: 5001
			})

			// Refresh server config
			const updatedConfig = await getServerConfig()
			setServerConfigState(updatedConfig)

			Alert.alert('Success', 'Server added to saved servers')
		} catch (error) {
			console.error('Failed to add server:', error)
			Alert.alert('Error', 'Failed to add server')
		}
	}

	const handleSaveServerSettings = () => {
		setShowServerSettings(false)
		Alert.alert('Server Settings', 'Server configuration saved successfully!')
	}

	const handleClearStorage = () => {
		Alert.alert('Clear Storage', 'This will delete all application data including login tokens, server settings, and cached data. Are you sure you want to continue?', [
			{
				text: 'Cancel',
				style: 'cancel'
			},
			{
				text: 'Clear All Data',
				style: 'destructive',
				onPress: async () => {
					try {
						// Clear all AsyncStorage data
						await AsyncStorage.clear()

						// Reset state to defaults
						setUsername('ahmed')
						setPassword('123')
						setCustomUrl('192.168.1.15')
						setServerConfigState({ mode: 'local', customUrl: '192.168.1.15', localServers: [] })

						// Close the modal
						setShowServerSettings(false)

						Alert.alert('Success', 'All application data has been cleared. The app will restart fresh.')
					} catch (error) {
						console.error('Failed to clear storage:', error)
						Alert.alert('Error', 'Failed to clear storage. Please try again.')
					}
				}
			}
		])
	}

	return (
		<SafeAreaProvider>
			<SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'right', 'left']}>
				<StatusBar translucent={false} style={isDark ? 'light' : 'dark'} />
				<View style={styles.container}>
					{/* Server Settings Button */}
					<TouchableOpacity style={styles.serverSettingsButton} onPress={() => setShowServerSettings(true)}>
						<Text style={styles.serverSettingsButtonText}>⚙️</Text>
					</TouchableOpacity>

					<Text style={styles.title}>Drinaluza</Text>
					<TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} />
					<TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
					<View style={styles.buttonContainer}>
						<Button title="Sign In" onPress={handleSignIn} />
						<Button title="Sign Up" onPress={handleSignUp} />
					</View>

					{/* Server Settings Modal */}
					<Modal visible={showServerSettings} animationType="slide" transparent={true} onRequestClose={() => setShowServerSettings(false)}>
						<View style={styles.modalOverlay}>
							<View style={styles.modalContent}>
								<Text style={styles.modalTitle}>Server Settings</Text>

								<Text style={styles.modalLabel}>Server Mode</Text>
								<Picker selectedValue={serverConfig.mode} style={styles.modalPicker} onValueChange={(value: ServerMode) => handleServerModeChange(value)}>
									<Picker.Item label="Local" value="local" />
									<Picker.Item label="Development" value="development" />
									<Picker.Item label="Production" value="production" />
								</Picker>

								{serverConfig.mode === 'local' && (
									<View style={styles.inputContainer}>
										<Text style={styles.inputLabel}>Local Server IP</Text>
										<TextInput style={styles.textInput} value={customUrl} onChangeText={handleCustomUrlChange} placeholder="192.168.1.15" placeholderTextColor={colors.textSecondary} />
										<TouchableOpacity style={[styles.addButton, { marginTop: 8 }]} onPress={handleQuickAddServer}>
											<Text style={styles.addButtonText}>Save to Servers</Text>
										</TouchableOpacity>
									</View>
								)}

								{/* Clear Storage Button */}
								<View style={styles.clearStorageContainer}>
									<TouchableOpacity style={styles.clearStorageButton} onPress={handleClearStorage}>
										<Text style={styles.clearStorageButtonText}>🗑️ Clear All Data</Text>
									</TouchableOpacity>
									<Text style={styles.clearStorageDescription}>This will delete all app data including login tokens, settings, and cache</Text>
								</View>

								<View style={styles.modalButtonContainer}>
									<Button title="Save" onPress={handleSaveServerSettings} />
									<Button title="Cancel" onPress={() => setShowServerSettings(false)} />
								</View>
							</View>
						</View>
					</Modal>
				</View>
			</SafeAreaView>
		</SafeAreaProvider>
	)
}
