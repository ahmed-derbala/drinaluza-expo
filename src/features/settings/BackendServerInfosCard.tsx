import { useCallback, useEffect, useState, useImperativeHandle, forwardRef, useSyncExternalStore } from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BaseCard } from '@/features/common/cards/BaseCard'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import Spinner from '@/features/common/Spinner'
import { ConnectionService } from '@/core/connection'
import { getHealth, type HealthResponse } from './health.api'

const subscribeToBackendState = (onStoreChange: () => void): (() => void) => {
	return ConnectionService.subscribe(() => onStoreChange())
}

export interface BackendServerInfosCardHandle {
	refresh: () => Promise<void>
}

export const BackendServerInfosCard = forwardRef<BackendServerInfosCardHandle, {}>(function BackendServerInfosCard(_props, ref) {
	const { colors } = useTheme()
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [info, setInfo] = useState<HealthResponse | null>(null)
	const backendState = useSyncExternalStore(subscribeToBackendState, ConnectionService.getBackendState, ConnectionService.getBackendState)

	const load = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const data = await getHealth()
			setInfo(data)
		} catch {
			setError(translate('backend_info_load_failed', 'Failed to load server info'))
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		load()
	}, [load])

	useEffect(() => {
		if (backendState === 'online') {
			load()
		}
	}, [backendState, load])

	useImperativeHandle(ref, () => ({ refresh: load }), [load])

	const isOffline = backendState === 'offline'
	const isConnecting = backendState === 'connecting'

	if (isOffline) {
		return (
			<BaseCard title={translate('backend_server_info', 'Backend Server Info')} iconName="server-outline" backgroundColor={colors.background} borderColor={colors.border} style={styles.card}>
				<View style={styles.center}>
					<Ionicons name="cloud-offline" size={28} color={colors.error} />
				</View>
			</BaseCard>
		)
	}

	if (isConnecting) {
		return (
			<BaseCard title={translate('backend_server_info', 'Backend Server Info')} iconName="server-outline" backgroundColor={colors.background} borderColor={colors.border} style={styles.card}>
				<View style={styles.center}>
					<Spinner size="small" expand={false} />
				</View>
			</BaseCard>
		)
	}

	if (loading) {
		return (
			<BaseCard title={translate('backend_server_info', 'Backend Server Info')} iconName="server-outline" backgroundColor={colors.background} borderColor={colors.border} style={styles.card}>
				<View style={styles.center}>
					<Spinner size="small" expand={false} />
				</View>
			</BaseCard>
		)
	}

	if (error || !info) {
		return (
			<BaseCard title={translate('backend_server_info', 'Backend Server Info')} iconName="server-outline" backgroundColor={colors.background} borderColor={colors.border} style={styles.card}>
				<View style={styles.center}>
					<Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
				</View>
			</BaseCard>
		)
	}

	const { data } = info

	return (
		<BaseCard title={translate('backend_server_info', 'Backend Server Info')} iconName="server-outline" backgroundColor={colors.background} borderColor={colors.border} style={styles.card}>
			<View style={styles.content}>
				<View style={styles.divider} />

				<View style={styles.grid}>
					<View style={styles.cell}>
						<Text style={[styles.cellLabel, { color: colors.textSecondary }]}>{translate('app', 'App')}</Text>
						<Text style={[styles.cellValue, { color: colors.text }]} numberOfLines={1}>
							{data.app.name}
						</Text>
						<Text style={[styles.cellMeta, { color: colors.textSecondary }]} numberOfLines={1}>
							{data.app.version}
						</Text>
					</View>

					<View style={[styles.cell, styles.borderLeft, { borderLeftColor: colors.border }]}>
						<Text style={[styles.cellLabel, { color: colors.textSecondary }]}>{translate('node', 'Node')}</Text>
						<Text style={[styles.cellValue, { color: colors.text }]} numberOfLines={1}>
							{data.node.env}
						</Text>
						<Text style={[styles.cellMeta, { color: colors.textSecondary }]} numberOfLines={1}>
							{data.node.version}
						</Text>
					</View>
				</View>

				<View style={styles.divider} />

				<View style={styles.row}>
					<View style={styles.rowItem}>
						<Ionicons name="time-outline" size={16} color={colors.primary} />
						<Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{translate('uptime', 'Uptime')}</Text>
					</View>
					<Text style={[styles.rowValue, { color: colors.text }]} numberOfLines={1}>
						{data.uptime}
					</Text>
				</View>

				<View style={[styles.row, styles.lastRow]}>
					<View style={styles.rowItem}>
						<Ionicons name="people-outline" size={16} color={colors.primary} />
						<Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{translate('socketio', 'Socket.IO')}</Text>
					</View>
					<Text style={[styles.rowValue, { color: colors.text }]} numberOfLines={1}>
						{data.socketio.publicClientsCount} {translate('public', 'public')} · {data.socketio.privateClientsCount} {translate('private', 'private')}
					</Text>
				</View>
			</View>
		</BaseCard>
	)
})

BackendServerInfosCard.displayName = 'BackendServerInfosCard'

const styles = StyleSheet.create({
	card: {
		marginBottom: 20
	},
	center: {
		alignItems: 'center',
		paddingVertical: 20
	},
	errorText: {
		fontSize: 14,
		fontWeight: '500'
	},
	content: {
		gap: 12
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: 'transparent'
	},
	grid: {
		flexDirection: 'row',
		gap: 16
	},
	cell: {
		flex: 1,
		gap: 2
	},
	borderLeft: {
		borderLeftWidth: StyleSheet.hairlineWidth
	},
	cellLabel: {
		fontSize: 11,
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.4
	},
	cellValue: {
		fontSize: 15,
		fontWeight: '700'
	},
	cellMeta: {
		fontSize: 12,
		fontWeight: '500'
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12
	},
	lastRow: {},
	rowItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6
	},
	rowLabel: {
		fontSize: 13,
		fontWeight: '500'
	},
	rowValue: {
		fontSize: 13,
		fontWeight: '600'
	}
})

export default BackendServerInfosCard
