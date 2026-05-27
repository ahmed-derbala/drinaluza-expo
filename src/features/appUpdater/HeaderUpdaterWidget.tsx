import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useUpdater } from './AppUpdater'
import { useTheme } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'

export const HeaderUpdaterWidget: React.FC = () => {
	const { isDownloading, downloadProgress, isReadyToInstall, installDownloadedUpdate, latestVersion } = useUpdater()
	const { colors } = useTheme()
	const { translate } = useUser()

	if (!isDownloading && !isReadyToInstall) {
		return null
	}

	const handlePress = async () => {
		if (isReadyToInstall) {
			Alert.alert(
				translate('install_update_title', 'Install Update'),
				translate('install_update_msg', `Version v${latestVersion} is downloaded and ready. Would you like to install and restart now?`),
				[
					{ text: translate('later', 'Later'), style: 'cancel' },
					{
						text: translate('install_now', 'Install Now'),
						onPress: async () => {
							await installDownloadedUpdate()
						}
					}
				]
			)
		} else if (isDownloading) {
			Alert.alert(
				translate('downloading_update_title', 'Downloading Update'),
				translate('downloading_update_msg', `The update is currently downloading: ${Math.round(downloadProgress * 100)}% complete. Please wait.`)
			)
		}
	}

	return (
		<TouchableOpacity
			onPress={handlePress}
			style={[
				styles.container,
				{
					backgroundColor: isReadyToInstall ? colors.success + '15' : colors.surface,
					borderColor: isReadyToInstall ? colors.success + '30' : colors.border
				}
			]}
			activeOpacity={0.7}
		>
			{isDownloading ? (
				<View style={styles.content}>
					<Ionicons name="download-outline" size={16} color={colors.primary} />
					<Text style={[styles.progressText, { color: colors.primary }]}>{Math.round(downloadProgress * 100)}%</Text>
				</View>
			) : (
				<View style={styles.content}>
					<Ionicons name="refresh-circle" size={20} color={colors.success} />
					{Platform.OS === 'web' && <Text style={[styles.restartText, { color: colors.success }]}>{translate('restart', 'Restart')}</Text>}
				</View>
			)}
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 8,
		paddingVertical: 6,
		borderRadius: 12,
		borderWidth: 1,
		marginLeft: 4,
		minHeight: 38,
		elevation: 1,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.08,
		shadowRadius: 2
	},
	content: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6
	},
	progressText: {
		fontSize: 12,
		fontWeight: '700'
	},
	restartText: {
		fontSize: 12,
		fontWeight: '700'
	}
})

export default HeaderUpdaterWidget
