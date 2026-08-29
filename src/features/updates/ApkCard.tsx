import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, themeColors } from '@/core/theme'
import { config } from '@/config'
import { BaseCard } from '@/features/common/cards/BaseCard'
import { InstallButton } from '@/features/common/buttons/InstallButton'
import { DeleteButton } from '@/features/common/buttons/DeleteButton'
import { ShareButton } from '@/features/common/buttons/ShareButton'
import { CachedApkMetadata } from './types'
import { formatBytes } from '@/core/helpers/format'

const styles = StyleSheet.create({
	card: {
		flexDirection: 'column',
		gap: 14,
		padding: 16,
		borderRadius: 20,
		minHeight: 0
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14,
		width: '100%'
	},
	iconContainer: {
		width: 48,
		height: 48,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: themeColors.primary12
	},
	textContainer: {
		flex: 1,
		gap: 4
	},
	title: {
		fontSize: 15,
		fontWeight: '700'
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
		gap: 6
	},
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
		paddingHorizontal: 6,
		paddingVertical: 3,
		borderRadius: 8
	},
	badgeText: {
		fontSize: 10,
		fontWeight: '600'
	},
	actionBar: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-end',
		flexWrap: 'wrap',
		gap: 10
	}
})

export interface ApkCardProps {
	apk: CachedApkMetadata
	onInstall: (fileUri: string) => void
	onDelete: (fileUri: string) => void
	onShare: (fileUri: string) => void
	disabledInstall?: boolean
}

export const ApkCard: React.FC<ApkCardProps> = ({ apk, onInstall, onDelete, onShare, disabledInstall = false }) => {
	const { colors } = useTheme()
	const isCurrentVersion = apk.version === config.app.version

	return (
		<BaseCard backgroundColor={colors.background} borderColor={colors.border} style={styles.card}>
			<View style={styles.topRow}>
				<View style={styles.iconContainer}>
					<Ionicons name="logo-android" size={22} color={colors.primary} />
				</View>
				<View style={styles.textContainer}>
					<Text style={[styles.title, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
						{apk.filename}
					</Text>
					<View style={styles.metaRow}>
						<View style={[styles.badge, { backgroundColor: themeColors.primary12 }]}>
							<Text style={[styles.badgeText, { color: colors.primary }]}>v{apk.version}</Text>
						</View>
						<View style={[styles.badge, { backgroundColor: themeColors.surfaceVariant }]}>
							<Text style={[styles.badgeText, { color: colors.textSecondary }]}>{formatBytes(apk.size)}</Text>
						</View>
					</View>
				</View>
			</View>

			<View style={styles.actionBar}>
				<InstallButton fileUri={apk.fileUri} onPress={() => onInstall(apk.fileUri)} disabled={disabledInstall || isCurrentVersion} />
				<DeleteButton onPress={() => onDelete(apk.fileUri)} />
				<ShareButton label="Share APK Installer" onPress={() => onShare(apk.fileUri)} />
			</View>
		</BaseCard>
	)
}

export default ApkCard
