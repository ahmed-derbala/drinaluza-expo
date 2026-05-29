import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, BackHandler, Dimensions, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as FileSystem from 'expo-file-system/legacy'
import { useTheme } from '@/core/theme'
import { APP_VERSION } from '@/config'
import { useAppUpdater } from './AppUpdaterContext'

export const AppUpdater: React.FC = () => {
	const { colors } = useTheme()
	const { showModal, setShowModal, startupState, updateInfo, isDownloading, downloadProgress, downloadUpdate, dismissUpdate } = useAppUpdater()

	const [freeStorage, setFreeStorage] = useState<string>('Checking...')

	useEffect(() => {
		if (showModal && Platform.OS !== 'web') {
			FileSystem.getFreeDiskStorageAsync()
				.then((bytes) => {
					const mb = bytes / (1024 * 1024)
					if (mb > 1024) {
						setFreeStorage((mb / 1024).toFixed(2) + ' GB')
					} else {
						setFreeStorage(mb.toFixed(1) + ' MB')
					}
				})
				.catch(() => {
					setFreeStorage('Unknown')
				})
		}
	}, [showModal])

	if (!showModal || !updateInfo) return null

	const isRequired = startupState === 'updateRequired'

	const messageText = isRequired ? 'A new update is available, please update your app to continue using it.' : 'A new update is available, you can update your app to continue using it.'

	const formattedSize = updateInfo.size ? (updateInfo.size / (1024 * 1024)).toFixed(1) + ' MB' : 'Unknown'

	const formatDate = (dateStr: string) => {
		if (!dateStr) return ''
		try {
			const d = new Date(dateStr)
			return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
		} catch (e) {
			return dateStr
		}
	}

	const handleExit = () => {
		if (Platform.OS === 'android') {
			BackHandler.exitApp()
		} else {
			// On iOS we can only dismiss
			setShowModal(false)
		}
	}

	const handleUpdate = () => {
		downloadUpdate()
	}

	const handleLater = () => {
		dismissUpdate()
	}

	return (
		<Modal visible={showModal} transparent={true} animationType="fade" statusBarTranslucent={true} onRequestClose={isRequired ? undefined : handleLater}>
			<View style={styles.overlay}>
				<LinearGradient colors={['rgba(3, 11, 26, 0.95)', 'rgba(12, 74, 110, 0.95)']} style={styles.gradientBg} />
				<View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					{/* Header Section */}
					<View style={styles.header}>
						<LinearGradient colors={isRequired ? ['#EF4444', '#F87171'] : ['#3B82F6', '#60A5FA']} style={styles.badge}>
							<Ionicons name={isRequired ? 'alert-circle' : 'cloud-download'} size={18} color="#FFFFFF" />
							<Text style={styles.badgeText}>{isRequired ? 'REQUIRED UPDATE' : 'OPTIONAL UPDATE'}</Text>
						</LinearGradient>

						<Text style={[styles.title, { color: colors.text }]}>{updateInfo.name}</Text>
						<Text style={[styles.message, { color: colors.textSecondary }]}>{messageText}</Text>
					</View>

					{/* Version Specs Grid */}
					<View style={[styles.gridContainer, { backgroundColor: colors.background + '60' }]}>
						<View style={styles.gridItem}>
							<Text style={[styles.gridLabel, { color: colors.textTertiary }]}>Installed Version</Text>
							<Text style={[styles.gridVal, { color: colors.text }]}>v{APP_VERSION}</Text>
						</View>
						<View style={[styles.gridDivider, { backgroundColor: colors.border }]} />
						<View style={styles.gridItem}>
							<Text style={[styles.gridLabel, { color: colors.textTertiary }]}>Latest Version</Text>
							<Text style={[styles.gridVal, { color: isRequired ? '#EF4444' : colors.primary }]}>{updateInfo.latest_version}</Text>
						</View>
					</View>

					{/* File Info Section */}
					<View style={styles.detailsRow}>
						<View style={styles.detailBlock}>
							<Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
							<Text style={[styles.detailText, { color: colors.textSecondary }]}>
								Size: <Text style={{ fontWeight: '700', color: colors.text }}>{formattedSize}</Text>
							</Text>
						</View>

						{Platform.OS !== 'web' && (
							<View style={styles.detailBlock}>
								<Ionicons name="pie-chart-outline" size={16} color={colors.textSecondary} />
								<Text style={[styles.detailText, { color: colors.textSecondary }]}>
									Free Space: <Text style={{ fontWeight: '700', color: colors.text }}>{freeStorage}</Text>
								</Text>
							</View>
						)}
					</View>

					<View style={styles.detailsRow}>
						<View style={styles.detailBlock}>
							<Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
							<Text style={[styles.detailText, { color: colors.textSecondary }]}>
								Released: <Text style={{ fontWeight: '700', color: colors.text }}>{formatDate(updateInfo.published_at)}</Text>
							</Text>
						</View>
						<View style={styles.detailBlock}>
							<Ionicons name="download-outline" size={16} color={colors.textSecondary} />
							<Text style={[styles.detailText, { color: colors.textSecondary }]}>
								Downloads: <Text style={{ fontWeight: '700', color: colors.text }}>{updateInfo.download_count}</Text>
							</Text>
						</View>
					</View>

					{/* Release Notes */}
					{updateInfo.changelog ? (
						<View style={styles.changelogWrapper}>
							<Text style={[styles.changelogHeader, { color: colors.textSecondary }]}>What's New</Text>
							<ScrollView style={[styles.changelogScroll, { backgroundColor: colors.background + '30', borderColor: colors.border }]}>
								<Text style={[styles.changelogText, { color: colors.textSecondary }]}>{updateInfo.changelog.replace(/## /g, '').replace(/### /g, '• ').replace(/#/g, '')}</Text>
							</ScrollView>
						</View>
					) : null}

					{/* Download Progress */}
					{isDownloading && (
						<View style={styles.progressContainer}>
							<View style={styles.progressHeader}>
								<Text style={[styles.progressTitle, { color: colors.textSecondary }]}>Downloading APK Update...</Text>
								<Text style={[styles.progressPercent, { color: colors.primary }]}>{Math.round(downloadProgress * 100)}%</Text>
							</View>
							<View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
								<View
									style={[
										styles.progressBarFill,
										{
											backgroundColor: colors.primary,
											width: `${downloadProgress * 100}%`
										}
									]}
								/>
							</View>
						</View>
					)}

					{/* Buttons Section */}
					<View style={styles.buttonRow}>
						{isRequired ? (
							<TouchableOpacity style={[styles.btn, styles.btnSecondary, { borderColor: colors.border }]} onPress={handleExit} disabled={isDownloading}>
								<Text style={[styles.btnText, { color: colors.textSecondary }]}>Exit</Text>
							</TouchableOpacity>
						) : (
							<TouchableOpacity style={[styles.btn, styles.btnSecondary, { borderColor: colors.border }]} onPress={handleLater} disabled={isDownloading}>
								<Text style={[styles.btnText, { color: colors.textSecondary }]}>Later</Text>
							</TouchableOpacity>
						)}

						<TouchableOpacity style={[styles.btn, styles.btnPrimary, { backgroundColor: isRequired ? '#EF4444' : colors.primary }]} onPress={handleUpdate} disabled={isDownloading}>
							{isDownloading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={[styles.btnText, styles.btnTextPrimary]}>Update Now</Text>}
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	)
}

const { width } = Dimensions.get('window')
const maxCardWidth = 500

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20
	},
	gradientBg: {
		...StyleSheet.absoluteFillObject
	},
	modalCard: {
		width: '100%',
		maxWidth: maxCardWidth,
		borderRadius: 24,
		borderWidth: 1,
		padding: 24,
		...Platform.select({
			ios: {
				shadowColor: '#000000',
				shadowOffset: { width: 0, height: 12 },
				shadowOpacity: 0.25,
				shadowRadius: 16
			},
			android: {
				elevation: 24
			},
			web: {
				boxShadow: '0px 12px 36px rgba(0, 0, 0, 0.4)'
			}
		})
	},
	header: {
		alignItems: 'center',
		marginBottom: 20
	},
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		marginBottom: 12
	},
	badgeText: {
		color: '#FFFFFF',
		fontSize: 11,
		fontWeight: '800',
		letterSpacing: 0.5
	},
	title: {
		fontSize: 22,
		fontWeight: '800',
		textAlign: 'center',
		marginBottom: 6,
		letterSpacing: -0.3
	},
	message: {
		fontSize: 13,
		textAlign: 'center',
		lineHeight: 18,
		paddingHorizontal: 8
	},
	gridContainer: {
		flexDirection: 'row',
		borderRadius: 14,
		paddingVertical: 12,
		paddingHorizontal: 16,
		alignItems: 'center',
		justifyContent: 'space-around',
		marginBottom: 16
	},
	gridItem: {
		alignItems: 'center',
		flex: 1
	},
	gridLabel: {
		fontSize: 10,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.4,
		marginBottom: 2
	},
	gridVal: {
		fontSize: 15,
		fontWeight: '800'
	},
	gridDivider: {
		width: 1,
		height: '80%'
	},
	detailsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 12,
		marginBottom: 8
	},
	detailBlock: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		flex: 1
	},
	detailText: {
		fontSize: 12
	},
	changelogWrapper: {
		marginTop: 16,
		marginBottom: 20
	},
	changelogHeader: {
		fontSize: 13,
		fontWeight: '700',
		marginBottom: 8,
		textTransform: 'uppercase',
		letterSpacing: 0.3
	},
	changelogScroll: {
		height: 100,
		borderRadius: 12,
		borderWidth: 1,
		padding: 12
	},
	changelogText: {
		fontSize: 12,
		lineHeight: 18
	},
	progressContainer: {
		marginBottom: 20
	},
	progressHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8
	},
	progressTitle: {
		fontSize: 12,
		fontWeight: '600'
	},
	progressPercent: {
		fontSize: 13,
		fontWeight: '700'
	},
	progressBarBg: {
		height: 6,
		borderRadius: 3,
		overflow: 'hidden'
	},
	progressBarFill: {
		height: '100%',
		borderRadius: 3
	},
	buttonRow: {
		flexDirection: 'row',
		gap: 12
	},
	btn: {
		flex: 1,
		height: 48,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1
	},
	btnSecondary: {
		backgroundColor: 'transparent'
	},
	btnPrimary: {
		borderWidth: 0
	},
	btnText: {
		fontSize: 15,
		fontWeight: '700'
	},
	btnTextPrimary: {
		color: '#FFFFFF'
	}
})
