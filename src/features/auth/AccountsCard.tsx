/**
 * AccountsCard — saved accounts card for the auth screen.
 *
 * Purpose: list saved accounts with quick-switch and remove actions.
 * The list has a capped height with its own vertical scroll so the
 * sign-in form below stays visible without scrolling the screen.
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

const ACCOUNTS_LIST_MAX_HEIGHT = 232

const formatLastAccess = (dateStr?: string) => {
	if (!dateStr) return ''
	try {
		const date = new Date(dateStr)
		if (isNaN(date.getTime())) return ''
		return `${format(date, 'MMM d, yyyy, h:mm a')} (${formatDistanceToNow(date, { addSuffix: true })})`
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
			<ScrollView style={styles.listScroll} contentContainerStyle={styles.list} showsVerticalScrollIndicator={true} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
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
										<Text style={[styles.accountAccessTime, { color: colors.textTertiary }]} numberOfLines={2}>
											{formatLastAccess(account.lastSignIn)}
										</Text>
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
			maxHeight: ACCOUNTS_LIST_MAX_HEIGHT
		},
		list: {
			gap: 10,
			paddingBottom: 4
		},
		accountRow: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			borderWidth: 1,
			borderRadius: 12,
			padding: 10
		},
		accountRowActive: {
			borderColor: colors.primary,
			backgroundColor: `${colors.primary}15`
		},
		accountRowClickable: {
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center'
		},
		accountAvatar: {
			width: 40,
			height: 40,
			borderRadius: 20,
			overflow: 'hidden',
			borderWidth: 1.5
		},
		accountAvatarActive: {
			borderColor: colors.primary
		},
		accountAvatarImg: {
			width: '100%',
			height: '100%'
		},
		accountInfo: {
			flex: 1,
			paddingHorizontal: 12
		},
		accountSlug: {
			fontSize: 14,
			fontWeight: '600'
		},
		accountSlugActive: {
			color: colors.primary
		},
		accountAccessTime: {
			fontSize: 11,
			marginTop: 2
		},
		accountRemoveBtn: {
			padding: 10,
			alignItems: 'center',
			justifyContent: 'center'
		}
	})

export default React.memo(AccountsCard)
