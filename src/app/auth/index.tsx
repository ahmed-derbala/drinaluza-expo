import React, { useEffect, useState } from 'react'
import { View, TextInput, Button, StyleSheet, Text, TouchableOpacity, Modal, Alert, FlatList, useWindowDimensions } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { signIn, signUp } from '../../core/auth/auth.api'
import { getServerConfig, setServerConfig, addLocalServer, updateLocalServer, removeLocalServer } from '../../components/settings/settings.api'
import { defaultLocalServers } from '../../config'
import { DEFAULT_LOCAL_URL } from '../../config'
import { ServerMode, ServerConfig, LocalServer } from '../../components/settings/settings.interface'
import { updateApiBaseUrl } from '../../core/api'
import { useTheme } from '../../contexts/ThemeContext'
import { createThemedStyles, commonThemedStyles } from '../../core/theme/createThemedStyles'

export default function AuthScreen() {
	const { colors, isDark } = useTheme()
	const { width } = useWindowDimensions()
	const maxWidth = 600
	const isWideScreen = width > maxWidth
	const [slug, setUsername] = useState('ahmed')
	const [password, setPassword] = useState('123')
	const [showServerSettings, setShowServerSettings] = useState(false)
	const [serverConfig, setServerConfigState] = useState<ServerConfig>({ mode: 'local', customUrl: DEFAULT_LOCAL_URL, localServers: [] })
	const [customUrl, setCustomUrl] = useState(DEFAULT_LOCAL_URL)
	const [showAddServer, setShowAddServer] = useState(false)
	const [newServerName, setNewServerName] = useState('')
	const [newServerUrl, setNewServerUrl] = useState('')
	const [newServerPort, setNewServerPort] = useState('5001')
	const [editingServer, setEditingServer] = useState<LocalServer | null>(null)
	const [statusState, setStatusState] = useState<'initial' | '404' | '409'>('initial')
	const [errorMessage, setErrorMessage] = useState('')
	const router = useRouter()

	const styles = createThemedStyles((colors) => ({
		...commonThemedStyles(colors),
		container: {
			flex: 1,
			justifyContent: 'center',
			padding: 20,
			backgroundColor: colors.background,
			alignItems: 'center'
		},
		innerContainer: {
			width: '100%',
			maxWidth: isWideScreen ? maxWidth : undefined,
			alignSelf: isWideScreen ? 'center' : undefined
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
		},
		serverItem: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			backgroundColor: colors.surface,
			padding: 12,
			marginVertical: 4,
			borderRadius: 8,
			borderWidth: 1,
			borderColor: colors.border
		},
		serverInfo: {
			flex: 1
		},
		serverName: {
			fontSize: 16,
			fontWeight: '600',
			color: colors.text,
			marginBottom: 4
		},
		serverUrl: {
			fontSize: 14,
			color: colors.textSecondary
		},
		serverActions: {
			flexDirection: 'row',
			gap: 8
		},
		actionButton: {
			padding: 8,
			borderRadius: 6,
			backgroundColor: colors.primary
		},
		actionButtonText: {
			color: colors.buttonText,
			fontSize: 12,
			fontWeight: '600'
		},
		deleteButton: {
			backgroundColor: colors.error
		},
		editButton: {
			backgroundColor: colors.accent
		},
		savedServersContainer: {
			marginBottom: 20
		},
		savedServersTitle: {
			fontSize: 16,
			fontWeight: '600',
			color: colors.text,
			marginBottom: 10
		}
	}))(colors)

	// 🔒 Removed automatic authentication check as requested

	// Load server configuration
	useEffect(() => {
		const loadServerConfig = async () => {
			const savedServerConfig = await getServerConfig()
			setServerConfigState(savedServerConfig)
			setCustomUrl(savedServerConfig.customUrl || '10.173.243.181')
		}
		loadServerConfig()
	}, [])

	const handleSignIn = async () => {
		try {
			console.log('Attempting to sign in...')
			const response = await signIn(slug, password)
			console.log('Sign in response:', response)

			// Verify token was stored
			const token = await AsyncStorage.getItem('authToken')
			console.log('Token stored after sign in:', token ? 'Yes' : 'No')

			if (token) {
				console.log('Navigating to /home')
				router.replace('/home' as any)
			} else {
				console.error('No token received after sign in')
				Alert.alert('Error', 'Sign in failed. Please try again.')
			}
		} catch (error: any) {
			console.log('Sign in catch block reached')
			const responseData = error.response?.data
			// Check status from both HTTP response and response body (some APIs return it there)
			const status = error.response?.status || responseData?.status || responseData?.statusCode
			const message = responseData?.message || error.message

			console.log('Detected status:', status)
			console.log('Detected message:', message)

			if (status === 404 || status === '404') {
				setStatusState('404')
				setErrorMessage(message)
			} else if (status === 409 || status === '409') {
				console.log('Detected incorrect password (409)')
				setPassword('') // Base clearing
				setStatusState('409')
				setErrorMessage('Try again')
			} else if (status === 401 || status === '401') {
				// Also handle 401 as it's common for unauthorized/wrong password
				Alert.alert('Unauthorized', message || 'Invalid credentials. Please check your username and password.')
			} else {
				console.log('Showing generic error alert')
				Alert.alert('Error', message || 'Sign in failed. Please check your credentials and try again.')
			}
		}
	}

	const handleGo = async () => {
		console.log('Go pressed, calling handleSignIn')
		await handleSignIn()
	}

	const handleSignUp = async () => {
		try {
			await signUp(slug, password)
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

	const handleApplyCurrentServer = async () => {
		if (!customUrl.trim()) {
			Alert.alert('Error', 'Please enter a server URL')
			return
		}

		try {
			// Build new server config using local mode and the current customUrl
			const newConfig: ServerConfig = {
				...serverConfig,
				mode: 'local',
				customUrl: customUrl.trim(),
				localServers: serverConfig.localServers || []
			}

			// Persist and apply the new configuration
			setServerConfigState(newConfig)
			await setServerConfig(newConfig)
			await updateApiBaseUrl()

			// Close the modal
			setShowServerSettings(false)

			Alert.alert('Success', 'Current server applied')
		} catch (error) {
			console.error('Failed to apply current server:', error)
			Alert.alert('Error', 'Failed to apply current server')
		}
	}

	const handleAddServer = async () => {
		if (!newServerName.trim() || !newServerUrl.trim() || !newServerPort.trim()) {
			Alert.alert('Error', 'Please fill in all fields')
			return
		}

		try {
			if (editingServer) {
				// Update existing server
				await updateLocalServer(editingServer.id, {
					name: newServerName.trim(),
					url: newServerUrl.trim(),
					port: parseInt(newServerPort, 10)
				})
				Alert.alert('Success', 'Server updated successfully')
			} else {
				// Add new server
				await addLocalServer({
					name: newServerName.trim(),
					url: newServerUrl.trim(),
					port: parseInt(newServerPort, 10)
				})
				Alert.alert('Success', 'Server added successfully')
			}

			// Refresh server config
			const updatedConfig = await getServerConfig()
			setServerConfigState(updatedConfig)

			// Reset form
			setNewServerName('')
			setNewServerUrl('')
			setNewServerPort('5001')
			setEditingServer(null)
			setShowAddServer(false)
		} catch (error) {
			console.error('Failed to save server:', error)
			Alert.alert('Error', 'Failed to save server')
		}
	}

	const handleUseServer = async (server: LocalServer) => {
		try {
			await updateLocalServer(server.id, { lastUsed: Date.now() })
			setCustomUrl(server.url)

			// Update the API base URL with both URL and port
			const newConfig: ServerConfig = {
				...serverConfig,
				customUrl: server.url,
				mode: 'local',
				localServers: serverConfig.localServers.map((s) => (s.id === server.id ? { ...s, lastUsed: Date.now() } : s))
			}

			setServerConfigState(newConfig)
			await setServerConfig(newConfig)
			await updateApiBaseUrl()

			Alert.alert('Success', `Switched to ${server.name}`)
		} catch (error) {
			console.error('Failed to switch server:', error)
			Alert.alert('Error', 'Failed to switch server')
		}
	}

	const handleEditServer = (server: LocalServer) => {
		setEditingServer(server)
		setNewServerName(server.name)
		setNewServerUrl(server.url)
		setNewServerPort(server.port.toString())
		setShowAddServer(true)
	}

	const handleDeleteServer = async (server: LocalServer) => {
		Alert.alert('Delete Server', `Are you sure you want to delete "${server.name}"?`, [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Delete',
				style: 'destructive',
				onPress: async () => {
					try {
						await removeLocalServer(server.id)

						// Refresh server config
						const updatedConfig = await getServerConfig()
						setServerConfigState(updatedConfig)

						Alert.alert('Success', 'Server deleted successfully')
					} catch (error) {
						console.error('Failed to delete server:', error)
						Alert.alert('Error', 'Failed to delete server')
					}
				}
			}
		])
	}

	const renderServerItem = ({ item }: { item: LocalServer }) => (
		<View style={styles.serverItem}>
			<View style={styles.serverInfo}>
				<Text style={styles.serverName}>{item.name}</Text>
				<Text style={styles.serverUrl}>
					{item.url}:{item.port}
				</Text>
			</View>
			<View style={styles.serverActions}>
				<TouchableOpacity style={styles.actionButton} onPress={() => handleUseServer(item)}>
					<Text style={styles.actionButtonText}>Use</Text>
				</TouchableOpacity>
				<TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => handleEditServer(item)}>
					<Text style={styles.actionButtonText}>Edit</Text>
				</TouchableOpacity>
				<TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDeleteServer(item)}>
					<Text style={styles.actionButtonText}>Del</Text>
				</TouchableOpacity>
			</View>
		</View>
	)

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
						setCustomUrl(DEFAULT_LOCAL_URL)
						setServerConfigState({ mode: 'local', customUrl: DEFAULT_LOCAL_URL, localServers: [] })

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
				<StatusBar style={isDark ? 'light' : 'dark'} />
				<View style={styles.container}>
					{/* Server Settings Button */}
					<TouchableOpacity style={styles.serverSettingsButton} onPress={() => setShowServerSettings(true)}>
						<Text style={styles.serverSettingsButtonText}>⚙️</Text>
					</TouchableOpacity>

					<View style={styles.innerContainer}>
						<Text style={styles.title}>Drinaluza</Text>
						<TextInput
							style={styles.input}
							placeholder="Username"
							value={slug}
							onChangeText={(text) => {
								setUsername(text)
								setStatusState('initial')
							}}
						/>
						<TextInput
							style={styles.input}
							placeholder="Password"
							value={password}
							onChangeText={(text) => {
								setPassword(text)
								setStatusState('initial')
							}}
							secureTextEntry
						/>

						{(statusState === '404' || statusState === '409') && (
							<Text
								style={{
									color: statusState === '404' ? colors.error : colors.accent,
									marginBottom: 10,
									textAlign: 'center',
									fontWeight: statusState === '409' ? 'bold' : 'normal'
								}}
							>
								{statusState === '404' ? `${errorMessage}\n` : 'Try again'}
							</Text>
						)}

						<View style={statusState === '404' ? styles.buttonContainer : {}}>
							{statusState === '404' ? (
								<>
									<Button title="Sign In" onPress={handleSignIn} />
									<Button title="Sign Up" onPress={handleSignUp} />
								</>
							) : (
								<Button title="Go" onPress={handleGo} />
							)}
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
										<>
											{/* Servers List */}
											<View style={styles.savedServersContainer}>
												<Text style={styles.savedServersTitle}>{serverConfig.localServers?.length ? 'Saved Servers' : 'Available Servers'}</Text>
												<FlatList
													data={serverConfig.localServers?.length ? serverConfig.localServers : defaultLocalServers}
													renderItem={renderServerItem}
													keyExtractor={(item) => item.id}
													style={{ maxHeight: 200 }}
												/>
											</View>

											{/* Current Server Input */}
											<View style={styles.inputContainer}>
												<Text style={styles.inputLabel}>Current Server IP</Text>
												<TextInput style={styles.textInput} value={customUrl} onChangeText={handleCustomUrlChange} placeholder={DEFAULT_LOCAL_URL} placeholderTextColor={colors.textSecondary} />
												<View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
													<TouchableOpacity style={[styles.addButton, { flex: 1 }]} onPress={handleQuickAddServer}>
														<Text style={styles.addButtonText}>Quick Save</Text>
													</TouchableOpacity>
													<TouchableOpacity style={[styles.addButton, { flex: 1 }]} onPress={() => setShowAddServer(true)}>
														<Text style={styles.addButtonText}>Add New Server</Text>
													</TouchableOpacity>
													<TouchableOpacity style={[styles.addButton, { flex: 1 }]} onPress={handleApplyCurrentServer}>
														<Text style={styles.addButtonText}>Apply</Text>
													</TouchableOpacity>
												</View>
											</View>
										</>
									)}

									{/* Clear Storage Button */}
									<View style={styles.clearStorageContainer}>
										<TouchableOpacity style={styles.clearStorageButton} onPress={handleClearStorage}>
											<Text style={styles.clearStorageButtonText}>🗑️ Clear All Data</Text>
										</TouchableOpacity>
										<Text style={styles.clearStorageDescription}>This will delete all app data including login tokens, settings, and cache</Text>
									</View>

									<View style={styles.modalButtonContainer}>
										<Button title="Cancel" onPress={() => setShowServerSettings(false)} />
									</View>
								</View>
							</View>
						</Modal>

						{/* Add/Edit Server Modal */}
						<Modal
							visible={showAddServer}
							animationType="slide"
							transparent={true}
							onRequestClose={() => {
								setShowAddServer(false)
								setEditingServer(null)
								setNewServerName('')
								setNewServerUrl('')
								setNewServerPort('5001')
							}}
						>
							<View style={styles.modalOverlay}>
								<View style={styles.modalContent}>
									<Text style={styles.modalTitle}>{editingServer ? 'Edit Server' : 'Add New Server'}</Text>

									<Text style={styles.inputLabel}>Server Name</Text>
									<TextInput style={styles.textInput} value={newServerName} onChangeText={setNewServerName} placeholder="My Development Server" placeholderTextColor={colors.textSecondary} />

									<Text style={styles.inputLabel}>Server URL</Text>
									<TextInput style={styles.textInput} value={newServerUrl} onChangeText={setNewServerUrl} placeholder={DEFAULT_LOCAL_URL} placeholderTextColor={colors.textSecondary} />

									<Text style={styles.inputLabel}>Port</Text>
									<TextInput style={styles.textInput} value={newServerPort} onChangeText={setNewServerPort} placeholder="5001" placeholderTextColor={colors.textSecondary} keyboardType="numeric" />

									<View style={styles.modalButtonContainer}>
										<Button
											title="Cancel"
											onPress={() => {
												setShowAddServer(false)
												setEditingServer(null)
												setNewServerName('')
												setNewServerUrl('')
												setNewServerPort('5001')
											}}
										/>
										<Button title={editingServer ? 'Update' : 'Add'} onPress={handleAddServer} />
									</View>
								</View>
							</View>
						</Modal>
					</View>
				</View>
			</SafeAreaView>
		</SafeAreaProvider>
	)
}
