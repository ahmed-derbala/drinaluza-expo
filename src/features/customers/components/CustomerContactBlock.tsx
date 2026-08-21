import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import { SmartMediaView } from '@/core/smart-media'
import { formatAddress } from '@/features/common/address'
import { PhoneButton } from '@/features/common/buttons/PhoneButton'
import { WhatsAppButton } from '@/features/common/buttons/WhatsAppButton'
import { EmailButton } from '@/features/common/buttons/EmailButton'
import { WebsiteButton } from '@/features/common/buttons/WebsiteButton'
import { DirectionsButton } from '@/features/common/buttons/DirectionsButton'
import { Customer } from '../customers.interface'

interface CustomerContactBlockProps {
	customer: Customer
	contactButtonSize?: number
}

export function CustomerContactBlock({ customer, contactButtonSize = 36 }: CustomerContactBlockProps) {
	const { colors } = useTheme()
	const { localize } = useUser()
	const address = formatAddress(customer.address, localize)

	return (
		<View style={[styles.container, { borderBottomColor: colors.border }]}>
			<View style={styles.info}>
				<SmartMediaView
					media={typeof customer.media?.thumbnail === 'string' ? customer.media.thumbnail : customer.media?.thumbnail?.url}
					style={[styles.avatar, { borderColor: colors.border }]}
					containerStyle={[styles.avatarContainer, { backgroundColor: colors.surface }]}
				/>
				<View style={styles.details}>
					<Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
						{localize(customer.name)}
					</Text>
					{address && (
						<Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={2}>
							{address}
						</Text>
					)}
				</View>
			</View>

			<View style={styles.contactButtons}>
				<PhoneButton phone={customer.contact?.phone} backupPhones={customer.contact?.backupPhones} size={contactButtonSize} />
				<WhatsAppButton whatsapp={customer.contact?.whatsapp} size={contactButtonSize} />
				<EmailButton email={customer.contact?.email} size={contactButtonSize} />
				<WebsiteButton website={customer.contact?.website} size={contactButtonSize} />
				<DirectionsButton location={customer.location} address={customer.address} size={contactButtonSize} />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 12,
		padding: 16,
		borderBottomWidth: 1
	},
	info: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1
	},
	avatarContainer: {
		borderRadius: 20,
		overflow: 'hidden'
	},
	avatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		borderWidth: 1,
		marginRight: 12
	},
	details: {
		flex: 1
	},
	name: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 2
	},
	address: {
		fontSize: 13
	},
	contactButtons: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6
	}
})
