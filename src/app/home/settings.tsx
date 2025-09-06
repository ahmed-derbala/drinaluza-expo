import React, { useEffect, useState } from 'react'
import { View, Text, Button, StyleSheet, TextInput, Alert, TouchableOpacity, FlatList, Modal } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { useRouter } from 'expo-router'
import { signOut } from '@/core/auth/auth.api'
import { getServerConfig, setServerConfig, addLocalServer, updateLocalServer, removeLocalServer, ServerMode, ServerConfig } from '@/components/settings/settings.api'
import { updateApiBaseUrl } from '@/core/api'
import { useTheme } from '@/contexts/ThemeContext'
import { createThemedStyles, commonThemedStyles } from '@/core/theme/createThemedStyles'
import { Theme, LocalServer } from '@/components/settings/settings.interface'

export default function SettingsScreen() {
	const { theme, colors, setTheme } = useTheme()
	const [serverConfig, setServerConfigState] = useState<ServerConfig>({ mode: 'local', customUrl: '192.168.1.15', localServers: [] })
	const [customUrl, setCustomUrl] = useState('192.168.1.15')
	const [showLocalServers, setShowLocalServers] = useState(false)
	const [showAddServer, setShowAddServer] = useState(false)
	const [newServerName, setNewServerName] = useState('')
	const [newServerUrl, setNewServerUrl] = useState('')
	const [newServerPort, setNewServerPort] = useState('5001')
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
		button: {
			marginTop: 20
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
		modalOverlay: {
			flex: 1,
			backgroundColor: colors.modalOverlay,
			justifyContent: 'center',
			alignItems: 'center'
		},
		modalContent: {
			backgroundColor: colors.modal,
			borderRadius: 12,
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
		modalButtonContainer: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			marginTop: 20
		}
	}))(colors)

	useEffect(() => {
		const loadServerSettings = async () => {
			const savedServerConfig = await getServerConfig()
			setServerConfigState(savedServerConfig)
			setCustomUrl(savedServerConfig.customUrl || '192.168.1.15')
		}
		loadServerSettings()
	}, [])

	const handleThemeChange = async (newTheme: Theme) => {
		await setTheme(newTheme)
	}

	const handleServerModeChange = async (mode: ServerMode) => {
		const newConfig: ServerConfig = {
			mode,
			customUrl: mode === 'local' ? customUrl : undefined
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
				customUrl: url
			}
			setServerConfigState(newConfig)
			await setServerConfig(newConfig)
			await updateApiBaseUrl()
		}
	}

	const handleAddServer = async () => {
		if (!newServerName.trim() || !newServerUrl.trim() || !newServerPort.trim()) {
			Alert.alert('Error', 'Please fill in all fields')
			return
		}

		try {
			await addLocalServer({
				name: newServerName.trim(),
				url: newServerUrl.trim(),
				port: parseInt(newServerPort, 10)
			})

			// Refresh server config
			const updatedConfig = await getServerConfig()
			setServerConfigState(updatedConfig)

			// Reset form
			setNewServerName('')
			setNewServerUrl('')
			setNewServerPort('5001')
			setShowAddServer(false)

			Alert.alert('Success', 'Server added successfully')
		} catch (error) {
			console.error('Failed to add server:', error)
			Alert.alert('Error', 'Failed to add server')
		}
	}

	const handleUseServer = async (server: LocalServer) => {
		try {
			await updateLocalServer(server.id, { lastUsed: Date.now() })
			await updateApiBaseUrl()

			// Refresh server config
			const updatedConfig = await getServerConfig()
			setServerConfigState(updatedConfig)

			Alert.alert('Success', `Switched to ${server.name}`)
		} catch (error) {
			console.error('Failed to switch server:', error)
			Alert.alert('Error', 'Failed to switch server')
		}
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
				<TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDeleteServer(item)}>
					<Text style={styles.actionButtonText}>Delete</Text>
				</TouchableOpacity>
			</View>
		</View>
	)

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

			{/* Server Section */}
			<Text style={styles.label}>Server</Text>
			<Picker selectedValue={serverConfig.mode} style={styles.picker} onValueChange={(value: ServerMode) => handleServerModeChange(value)}>
				<Picker.Item label="Local" value="local" />
				<Picker.Item label="Development" value="development" />
				<Picker.Item label="Production" value="production" />
			</Picker>

			{serverConfig.mode === 'local' && (
				<>
					<TouchableOpacity style={styles.addButton} onPress={() => setShowLocalServers(true)}>
						<Text style={styles.addButtonText}>Manage Local Servers ({serverConfig.localServers.length}/10)</Text>
					</TouchableOpacity>

					<View style={styles.inputContainer}>
						<Text style={styles.inputLabel}>Quick Add Server</Text>
						<TextInput style={styles.textInput} value={customUrl} onChangeText={handleCustomUrlChange} placeholder="192.168.1.15" placeholderTextColor={colors.textSecondary} />
					</View>
				</>
			)}

			<View style={styles.button}>
				<Button title="Sign Out" onPress={handleSignOut} />
			</View>

			{/* Local Servers Management Modal */}
			<Modal visible={showLocalServers} animationType="slide" transparent={true} onRequestClose={() => setShowLocalServers(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Local Servers</Text>

						<FlatList data={serverConfig.localServers} renderItem={renderServerItem} keyExtractor={(item) => item.id} style={{ maxHeight: 300 }} />

						<TouchableOpacity style={styles.addButton} onPress={() => setShowAddServer(true)}>
							<Text style={styles.addButtonText}>Add New Server</Text>
						</TouchableOpacity>

						<View style={styles.modalButtonContainer}>
							<Button title="Close" onPress={() => setShowLocalServers(false)} />
						</View>
					</View>
				</View>
			</Modal>

			{/* Add Server Modal */}
			<Modal visible={showAddServer} animationType="slide" transparent={true} onRequestClose={() => setShowAddServer(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Add Local Server</Text>

						<Text style={styles.inputLabel}>Server Name</Text>
						<TextInput style={styles.textInput} value={newServerName} onChangeText={setNewServerName} placeholder="My Development Server" placeholderTextColor={colors.textSecondary} />

						<Text style={styles.inputLabel}>Server URL</Text>
						<TextInput style={styles.textInput} value={newServerUrl} onChangeText={setNewServerUrl} placeholder="192.168.1.15" placeholderTextColor={colors.textSecondary} />

						<Text style={styles.inputLabel}>Port</Text>
						<TextInput style={styles.textInput} value={newServerPort} onChangeText={setNewServerPort} placeholder="5001" placeholderTextColor={colors.textSecondary} keyboardType="numeric" />

						<View style={styles.modalButtonContainer}>
							<Button title="Cancel" onPress={() => setShowAddServer(false)} />
							<Button title="Add Server" onPress={handleAddServer} />
						</View>
					</View>
				</View>
			</Modal>
		</View>
	)
}
