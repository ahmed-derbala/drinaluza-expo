import React, { useCallback, useEffect, useState, useImperativeHandle, forwardRef, memo } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as FileSystem from 'expo-file-system/legacy'
import { BaseCard } from '@/features/common/cards/BaseCard'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { toast } from '@/features/common/Toast'
import { clearAllCache, isProtectedKey } from '@/core/cache/store'
import { getAllKeys, getItemSize } from '@/core/storage'
import { formatBytes } from '@/core/helpers/format'
import { clearDirectory, getKnownDirectoryStats } from '@/core/cache/filesystem'

export interface CacheDetailsCardProps {
	onCacheCleared?: () => void
}

export interface CacheDetailsCardHandle {
	refresh: () => Promise<void>
}

interface CacheStats {
	apiCount: number
	apiBytes: number
	systemCount: number
	systemBytes: number
	docCount: number
	docBytes: number
}

const INITIAL_STATS: CacheStats = {
	apiCount: 0,
	apiBytes: 0,
	systemCount: 0,
	systemBytes: 0,
	docCount: 0,
	docBytes: 0
}

interface CacheRowProps {
	icon: keyof typeof Ionicons.glyphMap
	iconColor: string
	iconBg: string
	title: string
	subtitle: string
	disabled: boolean
	onClear: () => void
	clearLabel: string
	hideBorder?: boolean
}

const CacheRow = memo(function CacheRow({ icon, iconColor, iconBg, title, subtitle, disabled, onClear, clearLabel, hideBorder = false }: CacheRowProps) {
	const { colors } = useTheme()
	return (
		<View style={[styles.cacheRow, { borderBottomColor: colors.border, borderBottomWidth: hideBorder ? 0 : 1 }]}>
			<View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
				<Ionicons name={icon} size={20} color={iconColor} />
			</View>
			<View style={styles.rowInfo}>
				<Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
				<Text style={[styles.rowSubtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
			</View>
			<TouchableOpacity
				style={[styles.clearRowBtn, { backgroundColor: colors.error + '18', opacity: disabled ? 0.5 : 1 }]}
				onPress={onClear}
				disabled={disabled}
				accessibilityLabel={clearLabel}
				accessibilityRole="button"
			>
				<Ionicons name="trash-outline" size={16} color={disabled ? colors.textTertiary : colors.error} />
			</TouchableOpacity>
		</View>
	)
})

export const CacheDetailsCard = forwardRef<CacheDetailsCardHandle, CacheDetailsCardProps>(function CacheDetailsCard({ onCacheCleared }: CacheDetailsCardProps, ref) {
	const { colors } = useTheme()
	const [loading, setLoading] = useState(true)
	const [clearing, setClearing] = useState(false)
	const [stats, setStats] = useState<CacheStats>(INITIAL_STATS)

	const scanCache = useCallback(async () => {
		setLoading(true)
		try {
			// 1) API / Storage cache — parallel fetch of all key sizes
			const apiPromise = (async (): Promise<Pick<CacheStats, 'apiCount' | 'apiBytes'>> => {
				const allKeys = await getAllKeys()
				const cacheKeys = allKeys.filter((key) => !isProtectedKey(key))
				if (cacheKeys.length === 0) return { apiCount: 0, apiBytes: 0 }

				const sizes = await Promise.all(cacheKeys.map((key) => getItemSize(key)))
				let apiCount = 0
				let apiBytes = 0
				for (const size of sizes) {
					if (size > 0) {
						apiCount += 1
						apiBytes += size
					}
				}
				return { apiCount, apiBytes }
			})()

			// 2) System + Document directories — run in parallel (each already handles web/missing)
			const systemPromise = getKnownDirectoryStats(FileSystem.cacheDirectory)
			const docPromise = getKnownDirectoryStats(FileSystem.documentDirectory)

			const [apiStats, systemStats, docStats] = await Promise.all([apiPromise, systemPromise, docPromise])

			setStats({
				apiCount: apiStats.apiCount,
				apiBytes: apiStats.apiBytes,
				systemCount: systemStats.count,
				systemBytes: systemStats.bytes,
				docCount: docStats.count,
				docBytes: docStats.bytes
			})
		} catch {
			// silent fallback — keep previous stats
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		scanCache()
	}, [scanCache])

	useImperativeHandle(ref, () => ({ refresh: scanCache }), [scanCache])

	const withClearing = useCallback(
		async (action: () => Promise<void>, onSuccess: () => void, onError: string) => {
			setClearing(true)
			try {
				await action()
				toast.show({
					title: translate('success', 'Success'),
					content: translate('cache_cleared', 'Cache cleared successfully'),
					borderColor: colors.success
				})
				await scanCache()
				onSuccess?.()
			} catch {
				toast.show({
					title: translate('error', 'Error'),
					content: onError,
					borderColor: colors.error
				})
			} finally {
				setClearing(false)
			}
		},
		[colors.error, colors.success, scanCache]
	)

	const handleClearApiCache = useCallback(async () => {
		await withClearing(
			() => clearAllCache().then(() => {}),
			() => onCacheCleared?.(),
			'Failed to clear API cache'
		)
	}, [withClearing, onCacheCleared])

	const handleClearSystemCache = useCallback(async () => {
		await withClearing(
			async () => {
				if (Platform.OS !== 'web' && FileSystem.cacheDirectory) {
					await clearDirectory(FileSystem.cacheDirectory)
				}
			},
			() => onCacheCleared?.(),
			'Failed to clear system cache'
		)
	}, [withClearing, onCacheCleared])

	const handleClearDocument = useCallback(async () => {
		await withClearing(
			async () => {
				if (Platform.OS !== 'web' && FileSystem.documentDirectory) {
					await clearDirectory(FileSystem.documentDirectory)
				}
			},
			() => onCacheCleared?.(),
			'Failed to clear documents'
		)
	}, [withClearing, onCacheCleared])

	const totalBytes = stats.apiBytes + stats.systemBytes + stats.docBytes
	const totalItems = stats.apiCount + stats.systemCount + stats.docCount
	const busy = loading || clearing

	return (
		<BaseCard title={translate('cache_details', 'Cached Data Details')} iconName="server-outline" backgroundColor={colors.background} borderColor={colors.border} style={styles.card}>
			<View style={styles.container}>
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

				<View style={styles.breakdownList}>
					<CacheRow
						icon="documents-outline"
						iconColor={colors.primary}
						iconBg={colors.primary + '18'}
						title={translate('api_cache', 'API & Data Cache')}
						subtitle={`${stats.apiCount} ${translate('cached_entries', 'Cached Entries')} • ${formatBytes(stats.apiBytes)}`}
						disabled={busy || stats.apiCount === 0}
						onClear={handleClearApiCache}
						clearLabel={translate('clear_api_cache', 'Clear API Cache')}
					/>
					<CacheRow
						icon="folder-open-outline"
						iconColor={colors.warning}
						iconBg={colors.warning + '18'}
						title={translate('cache_directory', 'Cache Directory')}
						subtitle={`${stats.systemCount} ${translate('cached_files', 'Cached Files')} • ${formatBytes(stats.systemBytes)}`}
						disabled={busy || stats.systemCount === 0}
						onClear={handleClearSystemCache}
						clearLabel={translate('clear_system_cache', 'Clear Cache Directory')}
					/>
					<CacheRow
						icon="document-text-outline"
						iconColor={colors.success}
						iconBg={colors.success + '18'}
						title={translate('document_directory', 'Document Directory')}
						subtitle={`${stats.docCount} ${translate('cached_files', 'Cached Files')} • ${formatBytes(stats.docBytes)}`}
						disabled={busy || stats.docCount === 0}
						onClear={handleClearDocument}
						clearLabel={translate('clear_document_cache', 'Clear Document Directory')}
						hideBorder
					/>
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
