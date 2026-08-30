import { useCallback, useEffect, useState, useImperativeHandle, forwardRef, memo } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BaseCard } from '@/features/common/cards/BaseCard'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { toast } from '@/features/common/Toast'
import { clearAllCache } from '@/core/cache/store'
import { formatBytes } from '@/core/helpers/format'
import { clearDirectory, getDirectorySize, getCacheDirectory, getDocumentDirectory } from '@/core/disk'

export interface CacheDetailsCardProps {
	onCacheCleared?: () => void
}

export interface CacheDetailsCardHandle {
	refresh: () => Promise<void>
}

interface CacheStats {
	cacheDirectoryBytes: number
	documentDirectoryBytes: number
}

const INITIAL_STATS: CacheStats = {
	cacheDirectoryBytes: 0,
	documentDirectoryBytes: 0
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
			// Cache + Document directories — fast O(1) directory.size
			const [cacheDirectoryBytes, documentDirectoryBytes] = await Promise.all([getDirectorySize(getCacheDirectory()), getDirectorySize(getDocumentDirectory())])

			setStats({
				cacheDirectoryBytes,
				documentDirectoryBytes
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
				if (Platform.OS !== 'web') {
					await clearDirectory(getCacheDirectory())
				}
			},
			() => onCacheCleared?.(),
			'Failed to clear system cache'
		)
	}, [withClearing, onCacheCleared])

	const handleClearDocument = useCallback(async () => {
		await withClearing(
			async () => {
				if (Platform.OS !== 'web') {
					await clearDirectory(getDocumentDirectory())
				}
			},
			() => onCacheCleared?.(),
			'Failed to clear documents'
		)
	}, [withClearing, onCacheCleared])

	const busy = loading || clearing

	return (
		<BaseCard title={translate('cache_details', 'Cached Data Details')} iconName="server-outline" backgroundColor={colors.background} borderColor={colors.border} style={styles.card}>
			<View style={styles.container}>
				<View style={styles.breakdownList}>
					<CacheRow
						icon="documents-outline"
						iconColor={colors.primary}
						iconBg={colors.primary + '18'}
						title={translate('api_cache', 'API Cache')}
						subtitle={translate('api_cache_desc', 'Cached API responses')}
						disabled={busy}
						onClear={handleClearApiCache}
						clearLabel={translate('clear_api_cache', 'Clear API Cache')}
					/>
					<CacheRow
						icon="folder-open-outline"
						iconColor={colors.warning}
						iconBg={colors.warning + '18'}
						title={translate('cache_directory', 'Cache Directory')}
						subtitle={formatBytes(stats.cacheDirectoryBytes)}
						disabled={busy || stats.cacheDirectoryBytes === 0}
						onClear={handleClearSystemCache}
						clearLabel={translate('clear_system_cache', 'Clear Cache Directory')}
					/>
					<CacheRow
						icon="document-text-outline"
						iconColor={colors.success}
						iconBg={colors.success + '18'}
						title={translate('document_directory', 'Document Directory')}
						subtitle={formatBytes(stats.documentDirectoryBytes)}
						disabled={busy || stats.documentDirectoryBytes === 0}
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
