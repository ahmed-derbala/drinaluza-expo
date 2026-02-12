import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal } from 'react-native'
import { useTheme } from './ThemeContext'
import { fetchBackendInfo, checkVersionStatus, getVersionInfo, handleUpdate, shouldResetApp, resetWebApp, resetAndroidApp, BackendInfo, VersionStatus } from '../helpers/versionCheck'
import { showConfirm } from '../helpers/popup'
import { log } from '../log'

interface VersionContextType {
	versionStatus: VersionStatus
	backendInfo: BackendInfo | null
	checkVersion: () => Promise<void>
}

const VersionContext = createContext<VersionContextType>({
	versionStatus: 'up_to_date',
	backendInfo: null,
	checkVersion: async () => {}
})

export const useVersion = () => useContext(VersionContext)

export const VersionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const { colors } = useTheme()
	const [backendInfo, setBackendInfo] = useState<BackendInfo | null>(null)
	const [versionStatus, setVersionStatus] = useState<VersionStatus>('up_to_date')
	const [optionalPromptShown, setOptionalPromptShown] = useState(false)

	const checkVersion = useCallback(async () => {
		try {
			const info = await fetchBackendInfo()
			if (!info) return

			setBackendInfo(info)

			const status = checkVersionStatus(info)
			setVersionStatus(status)

			log({
				level: 'info',
				label: 'versionCheck',
				message: `Version status: ${status}`,
				data: getVersionInfo(info)
			})

			// If resetApp is requested and a version upgrade is needed, reset app data
			if (shouldResetApp(info) && (status === 'update_required' || status === 'update_available')) {
				if (Platform.OS === 'web') {
					resetWebApp()
					return
				} else {
					// On Android, clear AsyncStorage before prompting for update
					await resetAndroidApp()
				}
			}

			// On web, if update_required, immediately redirect to root
			if (Platform.OS === 'web' && status === 'update_required') {
				handleUpdate()
				return
			}

			// On Android, show optional update prompt (only once per app session)
			if (Platform.OS !== 'web' && status === 'update_available' && !optionalPromptShown) {
				setOptionalPromptShown(true)
				const versionInfo = getVersionInfo(info)

				showConfirm('Update Available', `A new version (${versionInfo.latestVersion}) is available. You are on ${versionInfo.currentVersion}.\n\nWould you like to download the latest version?`, () =>
					handleUpdate()
				)
			}
		} catch (error: any) {
			log({
				level: 'error',
				label: 'versionCheck',
				message: 'Version check failed',
				error
			})
		}
	}, [optionalPromptShown])

	// Check on mount
	useEffect(() => {
		checkVersion()
	}, [])

	return (
		<VersionContext.Provider value={{ versionStatus, backendInfo, checkVersion }}>
			{children}

			{/* Force update blocking modal — Android only (web auto-redirects) */}
			{Platform.OS !== 'web' && versionStatus === 'update_required' && (
				<Modal visible transparent animationType="fade" statusBarTranslucent>
					<View style={[modalStyles.overlay, { backgroundColor: colors.modalOverlay }]}>
						<View style={[modalStyles.container, { backgroundColor: colors.surface }]}>
							{/* Icon */}
							<View style={[modalStyles.iconContainer, { backgroundColor: colors.primaryContainer }]}>
								<Text style={modalStyles.icon}>⚠️</Text>
							</View>

							<Text style={[modalStyles.title, { color: colors.text }]}>Update Required</Text>

							<Text style={[modalStyles.message, { color: colors.textSecondary }]}>This version of the app is outdated and no longer supported. Please download the latest version to continue.</Text>

							{backendInfo && (
								<View style={[modalStyles.versionInfo, { backgroundColor: colors.surfaceVariant }]}>
									<Text style={[modalStyles.versionLabel, { color: colors.textTertiary }]}>Current version</Text>
									<Text style={[modalStyles.versionValue, { color: colors.error }]}>{getVersionInfo(backendInfo).currentVersion}</Text>
									<Text style={[modalStyles.versionLabel, { color: colors.textTertiary, marginTop: 8 }]}>Minimum required</Text>
									<Text style={[modalStyles.versionValue, { color: colors.success }]}>{getVersionInfo(backendInfo).minVersion}</Text>
								</View>
							)}

							<TouchableOpacity style={[modalStyles.button, { backgroundColor: colors.primary }]} onPress={handleUpdate} activeOpacity={0.8}>
								<Text style={[modalStyles.buttonText, { color: colors.buttonText }]}>Download Update</Text>
							</TouchableOpacity>
						</View>
					</View>
				</Modal>
			)}
		</VersionContext.Provider>
	)
}

const modalStyles = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 32
	},
	container: {
		width: '100%',
		maxWidth: 400,
		borderRadius: 20,
		padding: 32,
		alignItems: 'center'
	},
	iconContainer: {
		width: 64,
		height: 64,
		borderRadius: 32,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 20
	},
	icon: {
		fontSize: 32
	},
	title: {
		fontSize: 22,
		fontWeight: '700',
		marginBottom: 12,
		textAlign: 'center'
	},
	message: {
		fontSize: 15,
		lineHeight: 22,
		textAlign: 'center',
		marginBottom: 24
	},
	versionInfo: {
		width: '100%',
		borderRadius: 12,
		padding: 16,
		marginBottom: 24,
		alignItems: 'center'
	},
	versionLabel: {
		fontSize: 12,
		fontWeight: '500',
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	versionValue: {
		fontSize: 18,
		fontWeight: '700',
		marginTop: 4
	},
	button: {
		width: '100%',
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: 'center'
	},
	buttonText: {
		fontSize: 16,
		fontWeight: '600'
	}
})
