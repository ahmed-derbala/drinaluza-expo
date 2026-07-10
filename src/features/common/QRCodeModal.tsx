import React, { useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Platform, Alert, Share } from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import * as Print from 'expo-print'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import * as Clipboard from 'expo-clipboard'
import QRCode from 'react-native-qrcode-svg'
import { useTheme } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'

export interface QRCodeModalProps {
	visible: boolean
	onClose: () => void
	value: string
	title: string
	subtitle?: string
	filenamePrefix?: string
}

export default function QRCodeModal({ visible, onClose, value, title, subtitle, filenamePrefix = 'qrcode' }: QRCodeModalProps) {
	const { colors } = useTheme()
	const { translate } = useUser()
	const qrRef = useRef<any>(null)
	const containerRef = useRef<View>(null)

	// Get base64 representation of the QR code in a platform-resilient way
	const getQrBase64 = (): Promise<string> => {
		return new Promise((resolve, reject) => {
			if (Platform.OS === 'web') {
				try {
					const container = containerRef.current as any
					const svgElement = container?.querySelector ? container.querySelector('svg') : document.querySelector('svg')
					if (!svgElement) {
						reject(new Error('SVG element not found'))
						return
					}
					const svgString = new XMLSerializer().serializeToString(svgElement)
					const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
					const blobUrl = (window.URL || window.webkitURL).createObjectURL(svgBlob)

					const img = new window.Image()
					img.onload = () => {
						const canvas = document.createElement('canvas')
						canvas.width = 300
						canvas.height = 300
						const ctx = canvas.getContext('2d')
						if (ctx) {
							ctx.drawImage(img, 0, 0, 300, 300)
							const pngUrl = canvas.toDataURL('image/png')
							;(window.URL || window.webkitURL).revokeObjectURL(blobUrl)
							resolve(pngUrl)
						} else {
							reject(new Error('Failed to get canvas context'))
						}
					}
					img.onerror = (e) => {
						reject(e)
					}
					img.src = blobUrl
				} catch (error) {
					reject(error)
				}
			} else {
				if (qrRef.current) {
					qrRef.current.toDataURL((data: string) => {
						resolve(`data:image/png;base64,${data}`)
					})
				} else {
					reject(new Error('QR ref not ready'))
				}
			}
		})
	}

	const handlePrint = async () => {
		try {
			const base64Url = await getQrBase64()
			await printHtml(base64Url)
		} catch (error) {
			console.error('Print failed:', error)
			Alert.alert(translate('error', 'Error'), 'Failed to generate printable QR')
		}
	}

	const printHtml = async (base64Url: string) => {
		try {
			const html = `
				<html>
					<head>
						<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
					</head>
					<body style="text-align: center; margin-top: 50px; font-family: sans-serif;">
						<h1>${title}</h1>
						<img src="${base64Url}" style="width: 300px; height: 300px;" />
						${subtitle ? `<h2 style="color: #666; margin-top: 20px;">${subtitle}</h2>` : ''}
						<p style="color: #666; margin-top: 10px; font-size: 16px;">${value}</p>
					</body>
				</html>
			`

			if (Platform.OS === 'web') {
				const iframe = document.createElement('iframe')
				iframe.style.position = 'absolute'
				iframe.style.width = '0px'
				iframe.style.height = '0px'
				iframe.style.border = 'none'
				document.body.appendChild(iframe)

				const doc = iframe.contentWindow?.document
				if (doc) {
					doc.open()
					doc.write(html)
					doc.close()

					const img = doc.querySelector('img')
					if (img) {
						img.onload = () => {
							iframe.contentWindow?.focus()
							iframe.contentWindow?.print()
							setTimeout(() => document.body.removeChild(iframe), 1000)
						}
					} else {
						iframe.contentWindow?.focus()
						iframe.contentWindow?.print()
						setTimeout(() => document.body.removeChild(iframe), 1000)
					}
				}
			} else {
				await Print.printAsync({ html })
			}
		} catch (error) {
			console.error('Print failed:', error)
		}
	}

	const handleDownload = async () => {
		try {
			const base64Url = await getQrBase64()
			const cleanPrefix = filenamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_')
			const filename = `${cleanPrefix}_qrcode.png`

			if (Platform.OS === 'web') {
				const link = document.createElement('a')
				link.href = base64Url
				link.download = filename
				document.body.appendChild(link)
				link.click()
				document.body.removeChild(link)
			} else {
				const base64Data = base64Url.split(',')[1]
				const fileUri = FileSystem.documentDirectory + filename
				await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: FileSystem.EncodingType.Base64 })
				if (await Sharing.isAvailableAsync()) {
					await Sharing.shareAsync(fileUri)
				} else {
					Alert.alert(translate('success', 'Success'), 'File saved to: ' + fileUri)
				}
			}
		} catch (error) {
			console.error('Download failed:', error)
			Alert.alert(translate('error', 'Error'), 'Failed to download/share QR')
		}
	}

	const handleCopyLink = async () => {
		try {
			if (!value) return
			await Clipboard.setStringAsync(value)
			Alert.alert(translate('success', 'Success'), translate('link_copied', 'Link copied to clipboard!'))
		} catch (error) {
			console.error('Failed to copy link:', error)
			Alert.alert(translate('error', 'Error'), 'Failed to copy link')
		}
	}

	const handleShareLink = async () => {
		try {
			if (!value) return
			await Share.share({
				message: value,
				url: Platform.OS === 'ios' ? value : undefined
			})
		} catch (error) {
			console.error('Share failed:', error)
		}
	}

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
				<View style={[styles.qrModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					{/* Close Button */}
					<TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]} onPress={onClose} activeOpacity={0.7}>
						<Ionicons name="close" size={20} color={colors.text} />
					</TouchableOpacity>

					{/* Header */}
					<Text style={[styles.qrModalTitle, { color: colors.text }]} numberOfLines={1}>
						{title}
					</Text>
					{subtitle ? (
						<Text style={[styles.qrModalSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
							{subtitle}
						</Text>
					) : null}

					{/* QR Code Container */}
					<View ref={containerRef} style={[styles.qrImageContainer, { borderColor: colors.primary + '30', backgroundColor: '#FFFFFF', marginTop: subtitle ? 0 : 16 }]}>
						{visible && value ? (
							<QRCode
								value={value}
								size={190}
								color="#0B132B"
								backgroundColor="#FFFFFF"
								getRef={(ref) => {
									qrRef.current = ref
								}}
							/>
						) : (
							<ActivityIndicator size="large" color={colors.primary} />
						)}
					</View>

					{/* Action Buttons */}
					<View style={styles.qrActions}>
						<TouchableOpacity style={[styles.qrActionBtn, { backgroundColor: colors.primary }]} onPress={handleDownload} activeOpacity={0.8} disabled={!value}>
							<MaterialIcons name="file-download" size={22} color="#FFFFFF" />
							<Text style={styles.qrActionBtnText}>{translate('download', 'Download')}</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[styles.qrActionBtn, { backgroundColor: colors.primaryContainer, borderColor: colors.primary, borderWidth: 1 }]}
							onPress={handlePrint}
							activeOpacity={0.8}
							disabled={!value}
						>
							<MaterialIcons name="print" size={22} color={colors.primary} />
							<Text style={[styles.qrActionBtnText, { color: colors.primary }]}>{translate('print', 'Print')}</Text>
						</TouchableOpacity>
					</View>

					<View style={[styles.qrActions, { marginTop: 12 }]}>
						<TouchableOpacity
							style={[styles.qrActionBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.border, borderWidth: 1 }]}
							onPress={handleCopyLink}
							activeOpacity={0.8}
							disabled={!value}
						>
							<Ionicons name="copy-outline" size={20} color={colors.text} />
							<Text style={[styles.qrActionBtnText, { color: colors.text }]}>{translate('copy_link', 'Copy Link')}</Text>
						</TouchableOpacity>

						{Platform.OS !== 'web' && (
							<TouchableOpacity
								style={[styles.qrActionBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.border, borderWidth: 1 }]}
								onPress={handleShareLink}
								activeOpacity={0.8}
								disabled={!value}
							>
								<Ionicons name="share-social-outline" size={20} color={colors.text} />
								<Text style={[styles.qrActionBtnText, { color: colors.text }]}>{translate('share_link', 'Share')}</Text>
							</TouchableOpacity>
						)}
					</View>
				</View>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	modalOverlay: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24
	},
	qrModalCard: {
		width: '100%',
		maxWidth: 400,
		borderRadius: 24,
		padding: 28,
		alignItems: 'center',
		borderWidth: 1.5,
		position: 'relative',
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 10 },
				shadowOpacity: 0.25,
				shadowRadius: 20
			},
			android: {
				elevation: 10
			}
		})
	},
	closeBtn: {
		position: 'absolute',
		top: 16,
		right: 16,
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 10
	},
	qrModalTitle: {
		fontSize: 22,
		fontWeight: '700',
		textAlign: 'center',
		marginTop: 8,
		marginBottom: 4,
		paddingHorizontal: 24
	},
	qrModalSubtitle: {
		fontSize: 14,
		fontWeight: '500',
		marginBottom: 24,
		textAlign: 'center',
		paddingHorizontal: 24
	},
	qrImageContainer: {
		width: 220,
		height: 220,
		borderRadius: 20,
		borderWidth: 2,
		padding: 10,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 28,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.1,
				shadowRadius: 10
			},
			android: {
				elevation: 4
			}
		})
	},
	qrActions: {
		flexDirection: 'row',
		width: '100%',
		gap: 12
	},
	qrActionBtn: {
		flex: 1,
		flexDirection: 'row',
		height: 48,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 4
			},
			android: {
				elevation: 2
			}
		})
	},
	qrActionBtnText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#FFFFFF'
	}
})
