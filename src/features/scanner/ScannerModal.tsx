import React, { useState, useEffect } from 'react'
import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform, Alert, Dimensions } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, createShadow } from '@/core/theme'
import { useRouter } from 'expo-router'
import { useUser } from '@/core/contexts'
import { toast } from '@/features/common/Toast'

type ScannerModalProps = {
	visible: boolean
	onClose: () => void
}

export default function ScannerModal({ visible, onClose }: ScannerModalProps) {
	const { colors } = useTheme()
	const { translate } = useUser()
	const router = useRouter()
	const [permission, requestPermission] = useCameraPermissions()
	const [scanned, setScanned] = useState(false)

	useEffect(() => {
		if (visible) {
			setScanned(false)
			if (!permission?.granted && permission?.canAskAgain) {
				requestPermission()
			}
		}
	}, [visible, permission])

	const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
		if (scanned) return
		setScanned(true)

		console.log(`Scanned QR code: ${data}`)

		try {
			// E.g., https://drinaluza.vercel.app/b/my-business
			const baseUrl = process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://drinaluza.com'
			const frontendHostname = new URL(baseUrl).hostname
			const url = new URL(data)
			if (url.hostname.includes(frontendHostname) || url.hostname.includes('localhost')) {
				const path = url.pathname // e.g., /b/my-business
				if (path.startsWith('/b/') || path.startsWith('/businesses/')) {
					toast.show({ title: 'Success', message: translate('business_found', 'Business found!'), color: '#10B981' })
					onClose()
					// Expo Router will handle the alias /b/ or direct /businesses/ navigation
					setTimeout(() => {
						router.push(path as any)
					}, 300)
				} else if (path.startsWith('/u/') || path.startsWith('/users/')) {
					toast.show({ title: 'Success', message: translate('user_found', 'User found!'), color: '#10B981' })
					onClose()
					setTimeout(() => {
						router.push(path as any)
					}, 300)
				} else {
					// Other valid app URL
					onClose()
					setTimeout(() => {
						router.push(path as any)
					}, 300)
				}
			} else {
				Alert.alert(translate('invalid_qr', 'Invalid QR Code'), translate('unsupported_qr_link', 'This QR code does not belong to Drinaluza.'), [{ text: 'OK', onPress: () => setScanned(false) }])
			}
		} catch (error) {
			// Not a valid URL
			Alert.alert(translate('invalid_qr', 'Invalid QR Code'), translate('unreadable_qr', 'Could not read the QR code data.'), [{ text: 'OK', onPress: () => setScanned(false) }])
		}
	}

	return (
		<Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<View style={[styles.header, { backgroundColor: colors.background }]}>
					<Text style={[styles.title, { color: colors.text }]}>{translate('scan_qr', 'Scan QR Code')}</Text>
					<TouchableOpacity style={styles.closeBtn} onPress={onClose}>
						<Ionicons name="close" size={28} color={colors.text} />
					</TouchableOpacity>
				</View>

				{!permission?.granted ? (
					<View style={styles.permissionContainer}>
						<Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
						<Text style={[styles.permissionText, { color: colors.text }]}>{translate('camera_permission_required', 'We need your permission to use the camera.')}</Text>
						<TouchableOpacity style={[styles.permissionBtn, { backgroundColor: colors.primary }]} onPress={requestPermission}>
							<Text style={styles.permissionBtnText}>{translate('grant_permission', 'Grant Permission')}</Text>
						</TouchableOpacity>
					</View>
				) : (
					<View style={styles.cameraContainer}>
						{Platform.OS === 'web' ? (
							<View style={styles.webFallback}>
								<Text style={[styles.permissionText, { color: colors.text }]}>Camera scanning is limited on some web browsers. Use the mobile app for best results.</Text>
							</View>
						) : (
							<CameraView
								style={StyleSheet.absoluteFill}
								facing="back"
								barcodeScannerSettings={{
									barcodeTypes: ['qr']
								}}
								onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
							/>
						)}
						<View style={styles.overlay}>
							<View style={styles.scannerFrame} />
							<Text style={styles.instructionText}>{translate('point_camera_qr', 'Point your camera at a Drinaluza QR code')}</Text>
						</View>
					</View>
				)}
			</View>
		</Modal>
	)
}

const { width } = Dimensions.get('window')
const frameSize = Math.min(width * 0.7, 300)

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: Platform.OS === 'ios' ? 50 : 20,
		paddingBottom: 16,
		paddingHorizontal: 20,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(0,0,0,0.1)',
		zIndex: 10
	},
	title: {
		fontSize: 18,
		fontWeight: '600'
	},
	closeBtn: {
		position: 'absolute',
		right: 20,
		bottom: 16
	},
	permissionContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 32
	},
	permissionText: {
		fontSize: 16,
		textAlign: 'center',
		marginTop: 16,
		marginBottom: 24
	},
	permissionBtn: {
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 12
	},
	permissionBtnText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 16
	},
	cameraContainer: {
		flex: 1,
		position: 'relative'
	},
	overlay: {
		...StyleSheet.absoluteFill,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0,0,0,0.4)'
	},
	scannerFrame: {
		width: frameSize,
		height: frameSize,
		borderWidth: 2,
		borderColor: '#fff',
		backgroundColor: 'transparent',
		borderRadius: 24,
		// Semi-transparent cutout effect
		...createShadow({ offsetY: 0, opacity: 0.5, radius: 100, elevation: 0 })
	},
	instructionText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '500',
		marginTop: 32,
		textAlign: 'center',
		paddingHorizontal: 32
	},
	webFallback: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 32
	}
})
