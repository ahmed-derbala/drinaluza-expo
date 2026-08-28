import React, { useCallback, useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as FileSystem from 'expo-file-system/legacy'
import { BaseCard } from '@/features/common/cards/BaseCard'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { toast } from '@/features/common/Toast'
import { clearAllCache } from '@/core/cache'
import { getAllKeys, getItem } from '@/core/storage'

export interface CacheDetailsCardProps {
	onCacheCleared?: () => void
}

export interface CacheDetailsCardHandle {
	refresh: () => Promise<void>
}

const PROTECTED_KEYS = ['authToken', 'refreshToken', 'userData', 'user._id', 'user.slug', 'user.settings', 'saved_authentications', 'expoPushToken']

const formatBytes = (bytes: number): string => {
	if (!bytes || bytes <= 0) return '0 B'
	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB']
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
	const val = bytes / Math.pow(k, i)
	return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`
}

export const CacheDetailsCard = forwardRef<CacheDetailsCardHandle, CacheDetailsCardProps>(function CacheDetailsCard({ onCacheCleared }: CacheDetailsCardProps, ref) {
	const { colors } = useTheme()
	const [loading, setLoading] = useState(true)
	const [clearing, setClearing] = useState(false)
	const [apiCount, setApiCount] = useState(0)
	const [apiBytes, setApiBytes] = useState(0)
	const [systemCount, setSystemCount] = useState(0)
	const [systemBytes, setSystemBytes] = useState(0)
	const [docCount, setDocCount] = useState(0)
	const [docBytes, setDocBytes] = useState(0)

	const getDirectoryStats = useCallback(async (dirUri: string): Promise<{ count: number; bytes: number }> => {
		let count = 0
		let bytes = 0
		const stack: string[] = [dirUri]
		while (stack.length > 0) {
			const current = stack.pop()!
			try {
				const entries = await FileSystem.readDirectoryAsync(current)
				for (const entry of entries) {
					const entryUri = current.endsWith('/') ? current + entry : current + '/' + entry
					try {
						const info: any = await FileSystem.getInfoAsync(entryUri, { size: true } as any)
						if (!info.exists) continue
						if (info.isDirectory) {
							stack.push(entryUri.endsWith('/') ? entryUri : entryUri + '/')
						} else {
							count++
							if (info.size) bytes += info.size
						}
					} catch {}
				}
			} catch {}
		}
		return { count, bytes }
	}, [])

	const scanCache = useCallback(async () => {
		setLoading(true)
		try {
			// 1. Scan API / Storage cache
			let totalApiBytes = 0
			let count = 0
			const allKeys = await getAllKeys()
			const cacheKeys = allKeys.filter((key) => !PROTECTED_KEYS.some((prefix) => key === prefix || key.startsWith(`${prefix}:`)))

			for (const key of cacheKeys) {
				try {
					const val = await getItem(key)
					if (val !== null && val !== undefined) {
						count++
						totalApiBytes += typeof val === 'string' ? val.length : JSON.stringify(val).length
					}
				} catch {}
			}
			setApiCount(count)
			setApiBytes(totalApiBytes)

			// 2. Scan entire cacheDirectory (expo-image, tmp, etc.) — on native only
			if (Platform.OS !== 'web' && FileSystem.cacheDirectory) {
				try {
					const info = await FileSystem.getInfoAsync(FileSystem.cacheDirectory)
					if (info.exists) {
						const stats = await getDirectoryStats(FileSystem.cacheDirectory)
						setSystemCount(stats.count)
						setSystemBytes(stats.bytes)
					} else {
						setSystemCount(0)
						setSystemBytes(0)
					}
				} catch {
					setSystemCount(0)
					setSystemBytes(0)
				}
			} else {
				setSystemCount(0)
				setSystemBytes(0)
			}

			// 3. Scan entire documentDirectory (app files, videos, updates, QR tmp) — on native only
			if (Platform.OS !== 'web' && FileSystem.documentDirectory) {
				try {
					const info = await FileSystem.getInfoAsync(FileSystem.documentDirectory)
					if (info.exists) {
						const stats = await getDirectoryStats(FileSystem.documentDirectory)
						setDocCount(stats.count)
						setDocBytes(stats.bytes)
					} else {
						setDocCount(0)
						setDocBytes(0)
					}
				} catch {
					setDocCount(0)
					setDocBytes(0)
				}
			} else {
				setDocCount(0)
				setDocBytes(0)
			}
		} catch {
			// silent fallback
		} finally {
			setLoading(false)
		}
	}, [getDirectoryStats])

	useEffect(() => {
		scanCache()
	}, [scanCache])

	useImperativeHandle(ref, () => ({ refresh: scanCache }), [scanCache])

	const handleClearApiCache = async () => {
		setClearing(true)
		try {
			await clearAllCache()
			toast.show({
				title: translate('success', 'Success'),
				content: translate('cache_cleared', 'Cache cleared successfully'),
				borderColor: colors.success
			})
			await scanCache()
			onCacheCleared?.()
		} catch {
			toast.show({
				title: translate('error', 'Error'),
				content: 'Failed to clear API cache',
				borderColor: colors.error
			})
		} finally {
			setClearing(false)
		}
	}

	const handleClearSystemCache = async () => {
		setClearing(true)
		try {
			if (Platform.OS !== 'web' && FileSystem.cacheDirectory) {
				const cacheDir = FileSystem.cacheDirectory
				try {
					const files = await FileSystem.readDirectoryAsync(cacheDir)
					for (const file of files) {
						try {
							await FileSystem.deleteAsync(cacheDir + file, { idempotent: true })
						} catch {}
					}
				} catch {}
			}
			toast.show({
				title: translate('success', 'Success'),
				content: translate('cache_cleared', 'Cache cleared successfully'),
				borderColor: colors.success
			})
			await scanCache()
			onCacheCleared?.()
		} catch {
			toast.show({
				title: translate('error', 'Error'),
				content: 'Failed to clear system cache',
				borderColor: colors.error
			})
		} finally {
			setClearing(false)
		}
	}

	const handleClearDocument = async () => {
		setClearing(true)
		try {
			if (Platform.OS !== 'web' && FileSystem.documentDirectory) {
				const docDir = FileSystem.documentDirectory
				try {
					const files = await FileSystem.readDirectoryAsync(docDir)
					for (const file of files) {
						try {
							await FileSystem.deleteAsync(docDir + file, { idempotent: true })
						} catch {}
					}
				} catch {}
			}
			toast.show({
				title: translate('success', 'Success'),
				content: translate('cache_cleared', 'Cache cleared successfully'),
				borderColor: colors.success
			})
			await scanCache()
			onCacheCleared?.()
		} catch {
			toast.show({
				title: translate('error', 'Error'),
				content: 'Failed to clear documents',
				borderColor: colors.error
			})
		} finally {
			setClearing(false)
		}
	}

	const totalBytes = apiBytes + systemBytes + docBytes
	const totalItems = apiCount + systemCount + docCount

	return (
		<BaseCard title={translate('cache_details', 'Cached Data Details')} iconName="server-outline" backgroundColor={colors.background} borderColor={colors.border} style={styles.card}>
			<View style={styles.container}>
				{/* Total summary banner */}
				<View style={[styles.summaryBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
					<View style={styles.summaryLeft}>
						<Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{translate('total_cache_size', 'Total Cache Size')}</Text>
						<Text style={[styles.summaryValue, { color: colors.text }]}>{formatBytes(totalBytes)}</Text>
					</View>
					<View style={[styles.badge, { backgroundColor: colors.primaryContainer }]}>
						<Text style={[styles.badgeText, { color: colors.primary }]}>
							{totalItems} {translate('cached_entries', 'Cached Entries')}
						</Text>
					</View>
				</View>

				{/* Breakdown items */}
				<View style={styles.breakdownList}>
					{/* API & Data Cache */}
					<View style={[styles.cacheRow, { borderBottomColor: colors.border }]}>
						<View style={[styles.iconWrapper, { backgroundColor: colors.primary + '18' }]}>
							<Ionicons name="documents-outline" size={20} color={colors.primary} />
						</View>
						<View style={styles.rowInfo}>
							<Text style={[styles.rowTitle, { color: colors.text }]}>{translate('api_cache', 'API & Data Cache')}</Text>
							<Text style={[styles.rowSubtitle, { color: colors.textTertiary }]}>
								{apiCount} {translate('cached_entries', 'Cached Entries')} • {formatBytes(apiBytes)}
							</Text>
						</View>
						<TouchableOpacity
							style={[styles.clearRowBtn, { backgroundColor: colors.error + '18' }]}
							onPress={handleClearApiCache}
							disabled={loading || clearing || apiCount === 0}
							accessibilityLabel={translate('clear_api_cache', 'Clear API Cache')}
						>
							<Ionicons name="trash-outline" size={16} color={apiCount > 0 ? colors.error : colors.textTertiary} />
						</TouchableOpacity>
					</View>

					{/* Cache Directory (FileSystem.cacheDirectory — entire) */}
					<View style={[styles.cacheRow, { borderBottomColor: colors.border }]}>
						<View style={[styles.iconWrapper, { backgroundColor: colors.warning + '18' }]}>
							<Ionicons name="folder-open-outline" size={20} color={colors.warning} />
						</View>
						<View style={styles.rowInfo}>
							<Text style={[styles.rowTitle, { color: colors.text }]}>{translate('cache_directory', 'Cache Directory')}</Text>
							<Text style={[styles.rowSubtitle, { color: colors.textTertiary }]}>
								{systemCount} {translate('cached_files', 'Cached Files')} • {formatBytes(systemBytes)}
							</Text>
						</View>
						<TouchableOpacity
							style={[styles.clearRowBtn, { backgroundColor: colors.error + '18' }]}
							onPress={handleClearSystemCache}
							disabled={loading || clearing || systemCount === 0}
							accessibilityLabel={translate('clear_system_cache', 'Clear Cache Directory')}
						>
							<Ionicons name="trash-outline" size={16} color={systemCount > 0 ? colors.error : colors.textTertiary} />
						</TouchableOpacity>
					</View>

					{/* Document Directory (FileSystem.documentDirectory — entire) */}
					<View style={styles.cacheRow}>
						<View style={[styles.iconWrapper, { backgroundColor: colors.success + '18' }]}>
							<Ionicons name="document-text-outline" size={20} color={colors.success} />
						</View>
						<View style={styles.rowInfo}>
							<Text style={[styles.rowTitle, { color: colors.text }]}>{translate('document_directory', 'Document Directory')}</Text>
							<Text style={[styles.rowSubtitle, { color: colors.textTertiary }]}>
								{docCount} {translate('cached_files', 'Cached Files')} • {formatBytes(docBytes)}
							</Text>
						</View>
						<TouchableOpacity
							style={[styles.clearRowBtn, { backgroundColor: colors.error + '18' }]}
							onPress={handleClearDocument}
							disabled={loading || clearing || docCount === 0}
							accessibilityLabel={translate('clear_document_cache', 'Clear Document Directory')}
						>
							<Ionicons name="trash-outline" size={16} color={docCount > 0 ? colors.error : colors.textTertiary} />
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</BaseCard>
	)
})

CacheDetailsCard.displayName = 'CacheDetailsCard'

const styles = StyleSheet.create({
	card: {
		marginBottom: 20
	},
	container: {
		gap: 16
	},
	summaryBanner: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 14,
		borderRadius: 12,
		borderWidth: 1
	},
	summaryLeft: {
		gap: 2
	},
	summaryLabel: {
		fontSize: 12,
		fontWeight: '500',
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	summaryValue: {
		fontSize: 20,
		fontWeight: '700'
	},
	badge: {
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 8
	},
	badgeText: {
		fontSize: 12,
		fontWeight: '600'
	},
	breakdownList: {
		borderRadius: 12,
		overflow: 'hidden'
	},
	cacheRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: 'transparent',
		gap: 12
	},
	iconWrapper: {
		width: 38,
		height: 38,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center'
	},
	rowInfo: {
		flex: 1
	},
	rowTitle: {
		fontSize: 15,
		fontWeight: '600'
	},
	rowSubtitle: {
		fontSize: 13,
		marginTop: 2
	},
	clearRowBtn: {
		width: 34,
		height: 34,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center'
	}
})

export default CacheDetailsCard
