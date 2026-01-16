import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Linking, Alert, useWindowDimensions } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { Sale } from './sales.api'
import { format } from 'date-fns'
import { orderStatusColors, orderStatusLabels } from '../../constants/orderStatus'
import SmartImage from '../common/SmartImage'
import { useUser } from '../../contexts/UserContext'

interface SaleCardProps {
	sale: Sale
}

const ProductItem = ({ product }: { product: Sale['products'][0] }) => {
	const { colors } = useTheme()
	const { localize, formatPrice } = useUser()

	const getImageUrl = () => {
		return product.product.media?.thumbnail?.url || product.product.defaultProduct?.media?.thumbnail?.url || null
	}

	const { translate } = useUser()
	const unitMeasure = product.product.unit?.measure || translate('unit', 'unit')

	return (
		<View style={[styles.productItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
			<SmartImage source={getImageUrl()} style={styles.productImage} entityType="product" />
			<View style={styles.productDetails}>
				<Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
					{localize(product.product.name)}
				</Text>
				<View style={styles.productMeta}>
					<Text style={[styles.productQuantity, { color: colors.textSecondary }]}>
						{product.quantity} {unitMeasure}
					</Text>
					<Text style={[styles.productUnitPrice, { color: colors.textTertiary }]}>
						@ {formatPrice(product.product.price)}/{unitMeasure}
					</Text>
				</View>
				<Text style={[styles.productTotal, { color: colors.primary }]}>{formatPrice(product.lineTotal)}</Text>
			</View>
		</View>
	)
}

const SaleCard = ({ sale }: SaleCardProps) => {
	const { colors } = useTheme()
	const { localize, formatPrice, translate } = useUser()
	const { width } = useWindowDimensions()
	const isWeb = Platform.OS === 'web'
	const isTablet = width >= 768
	const isDesktop = width >= 1024

	const statusColor = orderStatusColors[sale.status as keyof typeof orderStatusColors] || colors.primary
	const statusLabel = orderStatusLabels[sale.status as keyof typeof orderStatusLabels] || sale.status

	const handlePhonePress = async () => {
		const phoneNumber = sale.customer.contact?.phone?.fullNumber
		if (phoneNumber) {
			const url = `tel:${phoneNumber}`
			const supported = await Linking.canOpenURL(url)
			if (supported) {
				await Linking.openURL(url)
			} else {
				Alert.alert(translate('error', 'Error'), `${translate('cannot_open_phone', 'Cannot open phone dialer for number')}: ${phoneNumber}`)
			}
		}
	}

	const handleWhatsAppPress = async () => {
		const whatsapp = sale.customer.contact?.whatsapp
		if (whatsapp) {
			const cleanNumber = whatsapp.replace(/[^0-9]/g, '')
			const url = `https://wa.me/${cleanNumber}`
			try {
				await Linking.openURL(url)
			} catch (err) {
				Alert.alert(translate('error', 'Error'), translate('cannot_open_whatsapp', 'Could not open WhatsApp'))
			}
		}
	}

	const handleEmailPress = async () => {
		const email = sale.customer.contact?.email
		if (email) {
			const url = `mailto:${email}`
			try {
				await Linking.openURL(url)
			} catch (err) {
				Alert.alert(translate('error', 'Error'), translate('cannot_open_email', 'Could not open email client'))
			}
		}
	}

	const handleLocationPress = async () => {
		const location = sale.customer.location
		const address = sale.customer.address

		if (location?.coordinates && location.sharingEnabled) {
			const [longitude, latitude] = location.coordinates
			const url = Platform.select({
				ios: `maps:0,0?q=${latitude},${longitude}`,
				android: `geo:${latitude},${longitude}?q=${latitude},${longitude}`,
				web: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
			})
			if (url) {
				try {
					await Linking.openURL(url)
				} catch (err) {
					Alert.alert(translate('error', 'Error'), translate('cannot_open_maps', 'Could not open maps application'))
				}
			}
		} else if (address) {
			const addressString = `${address.street}, ${address.city}, ${address.state}, ${address.country}`
			const encodedAddress = encodeURIComponent(addressString)
			const url = Platform.select({
				ios: `maps:0,0?q=${encodedAddress}`,
				android: `geo:0,0?q=${encodedAddress}`,
				web: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
			})
			if (url) {
				try {
					await Linking.openURL(url)
				} catch (err) {
					Alert.alert(translate('error', 'Error'), translate('cannot_open_maps', 'Could not open maps application'))
				}
			}
		}
	}

	return (
		<View
			style={[
				styles.card,
				{
					backgroundColor: colors.card,
					borderColor: colors.border
				}
			]}
		>
			{/* Header Section */}
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<Text style={[styles.shopName, { color: colors.text }]} numberOfLines={1}>
						{localize(sale.shop.name)}
					</Text>
					<Text style={[styles.dateText, { color: colors.textSecondary }]}>{format(new Date(sale.createdAt), 'MMM d, yyyy • h:mm a')}</Text>
				</View>
				<View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
					<View style={[styles.statusDot, { backgroundColor: statusColor }]} />
					<Text style={[styles.statusText, { color: statusColor }]} numberOfLines={1}>
						{statusLabel}
					</Text>
				</View>
			</View>

			{/* Customer Section */}
			<View style={[styles.customerSection, { borderBottomColor: colors.border }]}>
				<View style={styles.customerInfo}>
					<SmartImage
						source={sale.customer.media?.thumbnail?.url}
						style={[styles.avatar, { borderColor: colors.border }]}
						entityType="user"
						containerStyle={[styles.avatarContainer, { backgroundColor: colors.surface }]}
					/>
					<View style={styles.customerDetails}>
						<Text style={[styles.customerName, { color: colors.text }]} numberOfLines={1}>
							{localize(sale.customer.name)}
						</Text>
						{sale.customer.address && (
							<Text style={[styles.customerAddress, { color: colors.textSecondary }]} numberOfLines={2}>
								{sale.customer.address.street}, {sale.customer.address.city}
							</Text>
						)}
					</View>
				</View>

				{/* Contact Icons */}
				<View style={styles.contactIcons}>
					{sale.customer.contact?.phone?.fullNumber && (
						<TouchableOpacity onPress={handlePhonePress} style={[styles.contactIcon, { backgroundColor: colors.surface }]} activeOpacity={0.7}>
							<Ionicons name="call-outline" size={18} color={colors.primary} />
						</TouchableOpacity>
					)}
					{sale.customer.contact?.whatsapp && (
						<TouchableOpacity onPress={handleWhatsAppPress} style={[styles.contactIcon, styles.whatsappIcon]} activeOpacity={0.7}>
							<Ionicons name="logo-whatsapp" size={18} color="#fff" />
						</TouchableOpacity>
					)}
					{sale.customer.contact?.email && (
						<TouchableOpacity onPress={handleEmailPress} style={[styles.contactIcon, { backgroundColor: colors.surface }]} activeOpacity={0.7}>
							<Ionicons name="mail-outline" size={18} color={colors.primary} />
						</TouchableOpacity>
					)}
					{(sale.customer.location?.coordinates || sale.customer.address) && (
						<TouchableOpacity onPress={handleLocationPress} style={[styles.contactIcon, { backgroundColor: colors.surface }]} activeOpacity={0.7}>
							<Ionicons name="location-outline" size={18} color={colors.primary} />
						</TouchableOpacity>
					)}
				</View>
			</View>

			{/* Products Section - Scrollable */}
			<View style={styles.productsContainer}>
				<Text style={[styles.productsTitle, { color: colors.textSecondary }]}>
					{translate('products', 'Products')} ({sale.products.length})
				</Text>
				<ScrollView horizontal showsHorizontalScrollIndicator={isWeb} contentContainerStyle={styles.productsScrollContent} style={styles.productsScroll}>
					{sale.products.map((product, index) => (
						<ProductItem key={`${product.product._id}_${index}`} product={product} />
					))}
				</ScrollView>
			</View>

			{/* Footer - Total Price */}
			<View style={[styles.footer, { borderTopColor: colors.border }]}>
				<Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{translate('total', 'Total')}</Text>
				<Text style={[styles.totalPrice, { color: colors.primary }]}>{formatPrice(sale.price)}</Text>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 16,
		borderWidth: 1,
		marginBottom: 16,
		overflow: 'hidden',
		width: '100%',
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 8
			},
			android: {
				elevation: 3
			},
			web: {
				boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
			}
		})
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
	shopName: {
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
	customerSection: {
		padding: 16,
		borderBottomWidth: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 12
	},
	customerInfo: {
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
	contactIcons: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8
	},
	contactIcon: {
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 1 },
				shadowOpacity: 0.1,
				shadowRadius: 2
			},
			android: {
				elevation: 2
			}
		})
	},
	whatsappIcon: {
		backgroundColor: '#25D366'
	},
	productsContainer: {
		paddingVertical: 12
	},
	productsTitle: {
		fontSize: 13,
		fontWeight: '600',
		paddingHorizontal: 16,
		marginBottom: 8,
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	productsScroll: {
		maxHeight: 140
	},
	productsScrollContent: {
		paddingHorizontal: 16,
		gap: 12
	},
	productItem: {
		flexDirection: 'row',
		width: 280,
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		gap: 12
	},
	productImage: {
		width: 60,
		height: 60,
		borderRadius: 8
	},
	productDetails: {
		flex: 1,
		justifyContent: 'space-between'
	},
	productName: {
		fontSize: 15,
		fontWeight: '600',
		marginBottom: 4
	},
	productMeta: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 4
	},
	productQuantity: {
		fontSize: 13
	},
	productUnitPrice: {
		fontSize: 12
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

export default SaleCard
