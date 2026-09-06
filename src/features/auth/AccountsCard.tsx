/**
 * AccountsCard — saved accounts card for the auth screen.
 *
 * Purpose: list saved accounts with quick-switch and remove actions.
 * The list scrolls horizontally so the sign-in form below stays visible
 * without scrolling the screen.
 * Based on BaseCard, view mode only. Renders nothing when empty.
 */
import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native'
import { format, formatDistanceToNow } from 'date-fns'
import { useTheme, type ThemeColors } from '@theme'
import { useUser } from '@contexts/UserContext'
import { BaseCard } from '@cards/BaseCard'
import { SmartMediaView } from '@smart-media'
import { DeleteButton } from '@buttons'
import type { SavedAuth } from './auth.api'

const ACCOUNT_CARD_WIDTH = 184

const formatLastAccess = (dateStr?: string) => {
	if (!dateStr) return ''
	try {
		const date = new Date(dateStr)
		if (isNaN(date.getTime())) return ''
		return format(date, 'MMM d, yyyy, h:mm a')
	} catch {
		return ''
	}
}

const formatElapsed = (dateStr?: string) => {
	if (!dateStr) return ''
	try {
		const date = new Date(dateStr)
		if (isNaN(date.getTime())) return ''
		return formatDistanceToNow(date, { addSuffix: true })
	} catch {
		return ''
	}
}

interface AccountsCardProps {
	savedAccounts: SavedAuth[]
	activeSlug: string
	onSelectAccount: (account: SavedAuth) => void
	onRemoveAccount: (slug: string) => void
	style?: StyleProp<ViewStyle>
}

const AccountsCard: React.FC<AccountsCardProps> = ({ savedAccounts, activeSlug, onSelectAccount, onRemoveAccount, style }) => {
	const { colors } = useTheme()
	const { translate } = useUser()
	const styles = useMemo(() => createStyles(colors), [colors])

	if (savedAccounts.length === 0) {
		return null
	}

	return (
		<BaseCard title={translate('saved_accounts', 'Saved Accounts')} iconName="people-outline" style={[styles.card, style]}>
			<ScrollView horizontal style={styles.listScroll} contentContainerStyle={styles.list} showsHorizontalScrollIndicator={true} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
				{savedAccounts.map((account) => {
					const isActive = activeSlug === account.slug
					return (
						<View key={account.slug} style={[styles.accountRow, { backgroundColor: colors.surface, borderColor: colors.border }, isActive && styles.accountRowActive]}>
							<TouchableOpacity style={styles.accountRowClickable} onPress={() => onSelectAccount(account)} activeOpacity={0.75} accessibilityLabel={`Switch to ${account.slug}`}>
								<View style={[styles.accountAvatar, { backgroundColor: colors.surface, borderColor: colors.border }, isActive && styles.accountAvatarActive]}>
									<SmartMediaView media={account.photoUrl} style={styles.accountAvatarImg} />
								</View>
								<View style={styles.accountInfo}>
									<Text style={[styles.accountSlug, { color: colors.text }, isActive && styles.accountSlugActive]} numberOfLines={1}>
										{account.slug}
									</Text>
									{account.lastSignIn && (
										<>
											<Text style={[styles.accountAccessTime, { color: colors.textTertiary }]} numberOfLines={1}>
												{formatLastAccess(account.lastSignIn)}
											</Text>
											<Text style={[styles.accountElapsedTime, { color: colors.textTertiary }]} numberOfLines={1}>
												{formatElapsed(account.lastSignIn)}
											</Text>
										</>
									)}
								</View>
							</TouchableOpacity>
							<DeleteButton onPress={() => onRemoveAccount(account.slug)} label={`Remove ${account.slug}`} style={styles.accountRemoveBtn} />
						</View>
					)
				})}
			</ScrollView>
		</BaseCard>
	)
}

const createStyles = (colors: ThemeColors) =>
	StyleSheet.create({
		card: {
			marginBottom: 20
		},
		listScroll: {
			flexGrow: 0
		},
		list: {
			flexDirection: 'row',
			gap: 10,
			paddingRight: 4
		},
		accountRow: {
			width: ACCOUNT_CARD_WIDTH,
			alignItems: 'center',
			borderWidth: 1,
			borderRadius: 14,
			padding: 16,
			paddingTop: 20
		},
		accountRowActive: {
			borderColor: colors.primary,
			backgroundColor: `${colors.primary}15`
		},
		accountRowClickable: {
			width: '100%',
			alignItems: 'center'
		},
		accountAvatar: {
			width: 64,
			height: 64,
			borderRadius: 32,
			overflow: 'hidden',
			borderWidth: 2
		},
		accountAvatarActive: {
			borderColor: colors.primary
		},
		accountAvatarImg: {
			width: '100%',
			height: '100%'
		},
		accountInfo: {
			width: '100%',
			alignItems: 'center',
			marginTop: 10
		},
		accountSlug: {
			fontSize: 16,
			fontWeight: '700',
			textAlign: 'center'
		},
		accountSlugActive: {
			color: colors.primary
		},
		accountAccessTime: {
			fontSize: 12,
			marginTop: 4,
			textAlign: 'center'
		},
		accountElapsedTime: {
			fontSize: 12,
			fontWeight: '600',
			marginTop: 2,
			textAlign: 'center'
		},
		accountRemoveBtn: {
			position: 'absolute',
			top: 2,
			right: 2,
			padding: 8,
			alignItems: 'center',
			justifyContent: 'center'
		}
	})

export default React.memo(AccountsCard)
