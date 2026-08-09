import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { format } from 'date-fns'
import { useTheme } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import { Sale } from './sales.api'
import { orderStatusColors, orderStatusLabels } from '@/features/orders/orders-statuses'
import SmartImage from '@/core/SmartImageViewer'
import { BaseCard } from '@/features/common/cards/BaseCard'
import { PhoneButton } from '@/features/common/buttons/PhoneButton'
import { WhatsAppButton } from '@/features/common/buttons/WhatsAppButton'
import { EmailButton } from '@/features/common/buttons/EmailButton'
import { WebsiteButton } from '@/features/common/buttons/WebsiteButton'
import { DirectionsButton } from '@/features/common/buttons/DirectionsButton'

interface SaleDetailsCardProps {
	sale: Sale
}

export default function SaleDetailsCard({ sale }: SaleDetailsCardProps) {
	const { colors } = useTheme()
	const { localize, formatPrice, translate } = useUser()

	const statusColor = orderStatusColors[sale.status as keyof typeof orderStatusColors] || colors.primary
	const statusLabel = orderStatusLabels[sale.status as keyof typeof orderStatusLabels] || sale.status

	return (
		<BaseCard style={styles.card} borderWidth={2} borderColor={colors.info}>
			{/* Header Section */}
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>
						{localize(sale.business.name)}
					</Text>
					<Text style={[styles.dateText, { color: colors.textSecondary }]}>{format(new Date(sale.createdAt), 'MMM d, yyyy • HH:mm')}</Text>
				</View>
				<View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
					<View style={[styles.statusDot, { backgroundColor: statusColor }]} />
					<Text style={[styles.statusText, { color: statusColor }]} numberOfLines={1}>
						{statusLabel}
					</Text>
				</View>
			</View>

			{/* Customer Section */}
			<View style={[styles.section, { borderBottomColor: colors.border }]}>
				<View style={styles.sectionHeaderRow}>
					<View style={styles.customerInfo}>
						<SmartImage
							source={typeof sale.customer.media?.thumbnail === 'string' ? sale.customer.media.thumbnail : sale.customer.media?.thumbnail?.url}
							style={styles.avatar}
							entityType="user"
							containerStyle={[styles.avatarContainer, { backgroundColor: colors.surface }]}
						/>
						<View style={styles.customerDetails}>
							<Text style={[styles.customerName, { color: colors.text }]} numberOfLines={1}>
								{localize(sale.customer.name)}
							</Text>
							{sale.customer.address && (
								<Text style={[styles.customerAddress, { color: colors.textSecondary }]} numberOfLines={2}>
									{[sale.customer.address.street, sale.customer.address.city, sale.customer.address.country].filter(Boolean).join(', ')}
								</Text>
							)}
						</View>
					</View>
					<View style={styles.contactButtons}>
						<PhoneButton phone={sale.customer.contact?.phone} backupPhones={sale.customer.contact?.backupPhones} size={36} />
						<WhatsAppButton whatsapp={sale.customer.contact?.whatsapp || sale.customer.contact?.phone?.fullNumber || sale.customer.contact?.backupPhones?.[0]?.fullNumber} size={36} />
						<EmailButton email={sale.customer.contact?.email} size={36} />
						<WebsiteButton website={sale.customer.contact?.website} size={36} />
						<DirectionsButton location={sale.customer.location} address={sale.customer.address} size={36} />
					</View>
				</View>
			</View>

			{/* Products Section */}
			<View style={styles.section}>
				<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
					{translate('products', 'Products')} ({sale.products.length})
				</Text>
				{sale.products.map((p, index) => {
					const imageUrl = p.product.media?.thumbnail?.url || p.product.defaultProduct?.media?.thumbnail?.url
					return (
						<View key={p._id ?? `${p.product._id}-${index}`} style={[styles.productRow, { borderBottomColor: colors.border }]}>
							<SmartImage source={imageUrl} style={styles.productImage} entityType="product" containerStyle={[styles.productImageContainer, { backgroundColor: colors.surface }]} />
							<View style={styles.productDetails}>
								<Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
									{localize(p.product.name)}
								</Text>
								<Text style={[styles.productMeta, { color: colors.textSecondary }]}>
									{p.quantity} {p.product.unit?.measure || translate('unit', 'unit')} @ {formatPrice(p.product.price)}/{p.product.unit?.measure || translate('unit', 'unit')}
								</Text>
								<Text style={[styles.productTotal, { color: colors.primary }]}>{formatPrice({ total: p.lineTotal })}</Text>
							</View>
						</View>
					)
				})}
			</View>

			{/* Footer */}
			<View style={[styles.footer, { borderTopColor: colors.border }]}>
				<Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{translate('total', 'Total')}</Text>
				<Text style={[styles.totalPrice, { color: colors.primary }]}>{formatPrice(sale.price)}</Text>
			</View>
		</BaseCard>
	)
}

const styles = StyleSheet.create({
	card: {
		padding: 0,
		marginBottom: 16
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		padding: 16,
		borderBottomWidth: 1,
		gap: 12
	},
	headerLeft: {
		flex: 1
	},
	businessName: {
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 4
	},
	dateText: {
		fontSize: 13
	},
	statusBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		gap: 6
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4
	},
	statusText: {
		fontSize: 12,
		fontWeight: '600'
	},
	section: {
		padding: 16,
		borderBottomWidth: 1
	},
	sectionHeaderRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 12
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: 12
	},
	customerInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1
	},
	avatarContainer: {
		borderRadius: 20,
		overflow: 'hidden',
		marginRight: 12
	},
	avatar: {
		width: 40,
		height: 40,
		borderRadius: 20
	},
	customerDetails: {
		flex: 1
	},
	customerName: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 2
	},
	customerAddress: {
		fontSize: 13
	},
	contactButtons: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6
	},
	productRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 12,
		borderBottomWidth: 1
	},
	productImageContainer: {
		borderRadius: 8,
		overflow: 'hidden'
	},
	productImage: {
		width: 60,
		height: 60,
		borderRadius: 8
	},
	productDetails: {
		flex: 1,
		justifyContent: 'center'
	},
	productName: {
		fontSize: 15,
		fontWeight: '600',
		marginBottom: 4
	},
	productMeta: {
		fontSize: 13,
		marginBottom: 4
	},
	productTotal: {
		fontSize: 16,
		fontWeight: '700'
	},
	footer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		borderTopWidth: 1
	},
	totalLabel: {
		fontSize: 14,
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	totalPrice: {
		fontSize: 22,
		fontWeight: '700'
	}
})
