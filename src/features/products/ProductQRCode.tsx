import React, { useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, Platform, Alert, StyleSheet } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import QRCode from 'qrcode'
import * as Print from 'expo-print'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { uploadFile } from '@/core/file'
import { updateProduct } from './products.api'
import SmartImage from '@/core/helpers/SmartImage'
import { useUser } from '@/core/contexts/UserContext'
import { ProductType } from './products.type'

type Props = {
	product: ProductType
	colors: any
	isDashboard?: boolean
}

export default function ProductQRCode({ product, colors, isDashboard = false }: Props) {
	const { translate, localize } = useUser()
	const [generating, setGenerating] = useState(false)
	const getQrUrl = (qr: any) => (typeof qr === 'string' ? qr : qr?.url)
	const [qrcodeUrl, setQrcodeUrl] = useState<string | undefined>(getQrUrl(product.qrcode))

	React.useEffect(() => {
		const qr = getQrUrl(product.qrcode)
		if (qr) {
			setQrcodeUrl(qr)
		}
	}, [product.qrcode])

	const handleGenerate = async () => {
		try {
			setGenerating(true)
			const baseUrl = process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://drinaluza.com'
			const link = `${baseUrl}/p/${product.slug}`
			const base64DataUrl = await QRCode.toDataURL(link, { width: 500, margin: 2 })

			const filename = `drinaluza_${product.slug}_qrcode.png`

			let uploadResult
			if (Platform.OS === 'web') {
				uploadResult = await uploadFile({
					uri: base64DataUrl,
					name: filename,
					type: 'image/png'
				})
			} else {
				const base64Data = base64DataUrl.split(',')[1]
				const fileUri = FileSystem.cacheDirectory + filename
				await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: FileSystem.EncodingType.Base64 })
				uploadResult = await uploadFile({
					uri: fileUri,
					name: filename,
					type: 'image/png'
				})
			}

			if (uploadResult.success && uploadResult.file) {
				await updateProduct(product.slug, { qrcode: uploadResult.file } as any)
				setQrcodeUrl(uploadResult.file.url)
				Alert.alert(translate('success', 'Success'), translate('qrcode_generated', 'QR code generated and saved successfully!'))
			} else {
				throw new Error(uploadResult.error || 'Upload failed')
			}
		} catch (error: any) {
			Alert.alert(translate('error', 'Error'), error.message || 'Failed to generate QR code')
		} finally {
			setGenerating(false)
		}
	}

	const handlePrint = async () => {
		if (!qrcodeUrl) return
		try {
			const baseUrl = process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://drinaluza.com'
			const link = `${baseUrl}/p/${product.slug}`
			const html = `
				<html>
					<head>
						<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
					</head>
					<body style="text-align: center; margin-top: 50px; font-family: sans-serif;">
						<h1>${localize(product.name) || product.slug}</h1>
						<img src="${qrcodeUrl}" style="width: 300px; height: 300px;" />
						<h2 style="color: #666; margin-top: 20px;">@${product.slug}</h2>
						<p style="color: #666; margin-top: 10px; font-size: 16px;">${link}</p>
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
			console.error(error)
		}
	}

	const handleDownload = async () => {
		if (!qrcodeUrl) return
		try {
			if (Platform.OS === 'web') {
				const link = document.createElement('a')
				link.href = qrcodeUrl
				link.download = `drinaluza_${product.slug}_qrcode.png`
				document.body.appendChild(link)
				link.click()
				document.body.removeChild(link)
			} else {
				const fileUri = FileSystem.documentDirectory + `drinaluza_${product.slug}_qrcode.png`
				const downloadedFile = await FileSystem.downloadAsync(qrcodeUrl, fileUri)
				if (await Sharing.isAvailableAsync()) {
					await Sharing.shareAsync(downloadedFile.uri)
				} else {
					Alert.alert(translate('success', 'Success'), 'File downloaded to: ' + downloadedFile.uri)
				}
			}
		} catch (error) {
			console.error(error)
		}
	}

	if (!isDashboard && !qrcodeUrl) return null

	return (
		<View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
			<View style={styles.header}>
				<Text style={[styles.title, { color: colors.text }]}>{translate('qr_code', 'QR Code')}</Text>
				{generating && <ActivityIndicator size="small" color={colors.primary} />}
			</View>

			{qrcodeUrl ? (
				<View style={styles.qrContent}>
					<SmartImage source={qrcodeUrl} style={styles.qrImage} entityType="product" />
					<View style={styles.actions}>
						{isDashboard && (
							<TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primaryContainer }]} onPress={handleGenerate} disabled={generating}>
								<MaterialIcons name="refresh" size={20} color={colors.primary} />
								<Text style={[styles.actionText, { color: colors.primary }]}>{translate('regenerate', 'Regenerate')}</Text>
							</TouchableOpacity>
						)}
						<TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.info + '20' }]} onPress={handleDownload}>
							<MaterialIcons name="file-download" size={20} color={colors.info} />
						</TouchableOpacity>
						<TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.warning + '20' }]} onPress={handlePrint}>
							<MaterialIcons name="print" size={20} color={colors.warning} />
						</TouchableOpacity>
					</View>
				</View>
			) : (
				<View style={styles.emptyState}>
					<Text style={[styles.emptyText, { color: colors.textSecondary }]}>{translate('no_qr_code', 'No QR code generated yet')}</Text>
					{isDashboard && (
						<TouchableOpacity style={[styles.generateBtn, { backgroundColor: colors.primary }]} onPress={handleGenerate} disabled={generating}>
							<MaterialIcons name="qr-code-2" size={20} color="#fff" />
							<Text style={styles.generateBtnText}>{translate('generate_qr', 'Generate QR Code')}</Text>
						</TouchableOpacity>
					)}
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		marginBottom: 24,
		borderRadius: 16,
		borderWidth: 1,
		padding: 16
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 16
	},
	title: {
		fontSize: 18,
		fontWeight: '600'
	},
	qrContent: {
		alignItems: 'center'
	},
	qrImage: {
		width: 200,
		height: 200,
		borderRadius: 12,
		marginBottom: 16
	},
	actions: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		flexWrap: 'wrap',
		gap: 12
	},
	actionBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 12,
		gap: 8
	},
	actionText: {
		fontWeight: '600',
		fontSize: 14
	},
	emptyState: {
		alignItems: 'center',
		paddingVertical: 24
	},
	emptyText: {
		fontSize: 15,
		marginBottom: 16
	},
	generateBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 12,
		gap: 8
	},
	generateBtnText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 15
	}
})
