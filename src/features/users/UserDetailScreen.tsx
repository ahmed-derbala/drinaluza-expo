import { SmartHeader } from '@/core/smart-header'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, RefreshControl, Linking, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useTheme, createShadow } from '../../core/theme'
import { useUser } from '../../core/contexts/UserContext'
import { getUserBySlug } from './users.api'
import { UserProfile } from './users.interface'
import ErrorState from '../common/ErrorState'
import LoadingState from '@/features/common/LoadingState'
import SmartImage from '@/core/SmartImageViewer'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import QRCodeModal from '@/features/common/QRCodeModal'

export default function UserDetailScreen() {
	const { userSlug, name: initialNameParam } = useLocalSearchParams<{ userSlug: string; name?: string }>()
	const { colors } = useTheme()
	const { localize, translate } = useUser()
	const insets = useSafeAreaInsets()

	const [user, setUser] = useState<UserProfile | null>(null)
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)
	const [showQRCode, setShowQRCode] = useState(false)

	const initialName = useMemo(() => {
		if (!initialNameParam) return null
		try {
			if (initialNameParam.startsWith('{')) {
				return localize(JSON.parse(initialNameParam))
			}
			return initialNameParam
		} catch {
			return initialNameParam
		}
	}, [initialNameParam, localize])

	const displayTitle = user ? localize(user.name) : initialName || translate('user_profile', 'User Profile')

	const loadUser = useCallback(
		async (isRefresh = false) => {
			if (!userSlug) return

			try {
				if (!isRefresh) setLoading(true)
				setError(null)
				const response = await getUserBySlug(userSlug)
				setUser(response.data)
			} catch (err: any) {
				console.error('Failed to load user:', err)
				setError({
					title: translate('error', 'Error'),
					message: err.message || translate('failed_to_load_user', 'Failed to load user profile.'),
					type: 'unknown'
				})
			} finally {
				setLoading(false)
				setRefreshing(false)
			}
		},
		[userSlug, translate]
	)

	useEffect(() => {
		loadUser()
	}, [loadUser])

	const handleRefresh = () => {
		setRefreshing(true)
		loadUser(true)
	}

	const handleCall = (phone: string) => {
		Linking.openURL(`tel:${phone}`)
	}

	const handleEmail = (email: string) => {
		Linking.openURL(`mailto:${email}`)
	}

	if (loading && !user) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<Stack.Screen options={{ headerShown: false }} />
				<SmartHeader title={displayTitle} subtitle={`@${userSlug}`} isLoading={true} />
				<LoadingState />
			</View>
		)
	}

	if (error || !user) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<Stack.Screen options={{ headerShown: false }} />
				<SmartHeader title={displayTitle} />
				<ErrorState
					title={error?.type === 'network' ? undefined : error?.title || translate('not_found', 'Not Found')}
					message={error?.type === 'network' ? undefined : error?.message || translate('user_not_found', 'User not found')}
					onRetry={error?.type === 'network' ? undefined : () => loadUser()}
					icon={error?.type === 'network' ? 'cloud-offline-outline' : 'alert-circle-outline'}
					iconOnly={error?.type === 'network'}
				/>
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen options={{ headerShown: false }} />
			<SmartHeader
				title={displayTitle}
				headerActions={
					[
						{
							key: 'qr-code',
							iconName: 'qr-code-outline',
							onPress: () => setShowQRCode(true),
							accessibilityLabel: 'QR Code'
						},
						{
							key: 'refresh',
							onPress: handleRefresh,
							isRefreshing: refreshing,
							accessibilityLabel: 'Refresh'
						}
					] as any[]
				}
				fallbackRoute="/(home)/feed"
			/>

			<SmartHeader.ScrollView
				contentContainerStyle={[styles.scrollContent, { paddingTop: 12, paddingBottom: 40 + insets.bottom }]}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
				showsVerticalScrollIndicator={false}
			>
				{/* Profile Header Card */}
				<View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: '#FFFFFF' }]}>
					<LinearGradient colors={[`${colors.primary}15`, 'transparent']} style={StyleSheet.absoluteFill} />

					<View style={styles.avatarContainer}>
						<SmartImage source={user.media?.thumbnail?.url} style={styles.avatar} entityType="user" />
						{user.state?.code === 'active' && <View style={[styles.activeBadge, { backgroundColor: colors.success, borderColor: colors.card }]} />}
					</View>

					<Text style={[styles.nameText, { color: colors.text }]}>{localize(user.name)}</Text>
					<View style={[styles.roleBadge, { backgroundColor: colors.primary + '20' }]}>
						<Text style={[styles.roleText, { color: colors.primary }]}>{user.role.replace('_', ' ').toUpperCase()}</Text>
					</View>
				</View>

				{/* Contact Information */}
				{(user.contact?.phone || user.contact?.email || user.contact?.whatsapp) && (
					<View style={[styles.section, { backgroundColor: colors.surfaceVariant, borderColor: '#FFFFFF' }]}>
						<View style={styles.sectionHeader}>
							<Ionicons name="call-outline" size={20} color={colors.primary} />
							<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('contact_info', 'Contact Information')}</Text>
						</View>

						{user.contact?.phone && (
							<TouchableOpacity style={[styles.infoRow, { borderBottomColor: colors.border }]} onPress={() => handleCall(user.contact!.phone!.fullNumber)}>
								<View style={styles.infoIconContainer}>
									<Ionicons name="call" size={18} color={colors.primary} />
								</View>
								<View style={styles.infoContent}>
									<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{translate('phone', 'Phone')}</Text>
									<Text style={[styles.infoValue, { color: colors.text }]}>{user.contact.phone.fullNumber}</Text>
								</View>
								<Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
							</TouchableOpacity>
						)}

						{user.contact?.whatsapp && (
							<TouchableOpacity style={[styles.infoRow, { borderBottomColor: colors.border }]} onPress={() => Linking.openURL(`whatsapp://send?phone=${user.contact!.whatsapp}`)}>
								<View style={styles.infoIconContainer}>
									<Ionicons name="logo-whatsapp" size={18} color="#25D366" />
								</View>
								<View style={styles.infoContent}>
									<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{translate('whatsapp', 'WhatsApp')}</Text>
									<Text style={[styles.infoValue, { color: colors.text }]}>{user.contact.whatsapp}</Text>
								</View>
								<Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
							</TouchableOpacity>
						)}

						{user.contact?.email && (
							<TouchableOpacity style={[styles.infoRow, { borderBottomWidth: 0 }]} onPress={() => handleEmail(user.contact!.email!)}>
								<View style={styles.infoIconContainer}>
									<Ionicons name="mail" size={18} color={colors.primary} />
								</View>
								<View style={styles.infoContent}>
									<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{translate('email', 'Email')}</Text>
									<Text style={[styles.infoValue, { color: colors.text }]}>{user.contact.email}</Text>
								</View>
								<Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
							</TouchableOpacity>
						)}
					</View>
				)}

				{/* Location / Address */}
				{user.address && (
					<View style={[styles.section, { backgroundColor: colors.surfaceVariant, borderColor: '#FFFFFF' }]}>
						<View style={styles.sectionHeader}>
							<Ionicons name="location-outline" size={20} color={colors.primary} />
							<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('location', 'Location')}</Text>
						</View>

						<View style={styles.addressContainer}>
							{user.address.street && <Text style={[styles.addressText, { color: colors.text }]}>{user.address.street}</Text>}
							{(user.address.city || user.address.region || user.address.country) && (
								<Text style={[styles.addressTextSecondary, { color: colors.textSecondary }]}>{[user.address.city, user.address.region, user.address.country].filter(Boolean).join(', ')}</Text>
							)}
						</View>
					</View>
				)}
			</SmartHeader.ScrollView>

			{/* QR Code Viewer Modal */}
			{user && (
				<QRCodeModal
					visible={showQRCode}
					onClose={() => setShowQRCode(false)}
					value={`${process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://drinaluza.com'}/u/${user.slug || userSlug}`}
					title={localize(user.name)}
					subtitle={`@${user.slug || userSlug}`}
					filenamePrefix={`user_${user.slug || userSlug}`}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	scrollContent: {
		padding: 16,
		paddingBottom: 40,
		gap: 16
	},
	profileCard: {
		alignItems: 'center',
		paddingVertical: 32,
		paddingHorizontal: 20,
		borderRadius: 20,
		borderWidth: 1.5,
		overflow: 'hidden',
		...createShadow({ offsetY: 4, opacity: 0.2, radius: 12, elevation: 6 })
	},
	avatarContainer: {
		position: 'relative',
		marginBottom: 16
	},
	avatar: {
		width: 120,
		height: 120,
		borderRadius: 60,
		borderWidth: 3,
		borderColor: '#FFFFFF'
	},
	activeBadge: {
		position: 'absolute',
		bottom: 4,
		right: 4,
		width: 24,
		height: 24,
		borderRadius: 12,
		borderWidth: 3
	},
	nameText: {
		fontSize: 24,
		fontWeight: '800',
		marginBottom: 8,
		textAlign: 'center'
	},
	roleBadge: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12
	},
	roleText: {
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.5
	},
	section: {
		borderRadius: 20,
		borderWidth: 1.5,
		padding: 20,
		...createShadow({ offsetY: 2, opacity: 0.1, radius: 8, elevation: 4 })
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 16
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		letterSpacing: 0.2
	},
	infoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth
	},
	infoIconContainer: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: 'rgba(255,255,255,0.05)',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12
	},
	infoContent: {
		flex: 1
	},
	infoLabel: {
		fontSize: 12,
		fontWeight: '500',
		marginBottom: 2
	},
	infoValue: {
		fontSize: 15,
		fontWeight: '600'
	},
	addressContainer: {
		backgroundColor: 'rgba(0,0,0,0.1)',
		padding: 16,
		borderRadius: 12
	},
	addressText: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 4
	},
	addressTextSecondary: {
		fontSize: 14,
		lineHeight: 20
	}
})
