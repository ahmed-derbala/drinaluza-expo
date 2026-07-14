import React from 'react'
import { View, TouchableOpacity, StyleSheet, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { hasDirectionsTarget, openDirections } from '@/core/helpers/maps'

export interface ContactButtonsContact {
	phone?: { fullNumber: string } | null
	whatsapp?: string | null
	email?: string | null
}

export interface ContactButtonsLocation {
	geo?: {
		type?: string
		coordinates?: number[]
	}
	coordinates?: number[]
	type?: string
	sharingEnabled?: boolean
}

export interface ContactButtonsAddress {
	street?: string
	city?: string
	state?: string
	region?: string
	country?: string
}

interface ContactButtonsProps {
	contact?: ContactButtonsContact | null
	/** GPS location — used first for directions when coordinates are present */
	location?: ContactButtonsLocation | null
	/** Structured address — used as a directions fallback when GPS coordinates are unavailable */
	address?: ContactButtonsAddress | null
	/** Render buttons in a row (default) or stacked vertically */
	layout?: 'row' | 'column'
	/** Whether to show the email button. Defaults to true */
	showEmail?: boolean
	/** Tint color for the phone icon and its button background */
	phoneIconColor?: string
}

export default function ContactButtons({ contact, location, address, layout = 'row', showEmail = true, phoneIconColor = '#4ADE80' }: ContactButtonsProps) {
	const hasPhone = !!contact?.phone?.fullNumber
	const hasWhatsApp = !!contact?.whatsapp
	const hasEmail = showEmail && !!contact?.email

	const hasLocation = hasDirectionsTarget(location, address)

	if (!hasPhone && !hasWhatsApp && !hasEmail && !hasLocation) return null

	const handleCall = (e: any) => {
		e.stopPropagation?.()
		const phone = contact?.phone?.fullNumber
		if (phone) Linking.openURL(`tel:${phone}`).catch(() => {})
	}

	const handleWhatsApp = (e: any) => {
		e.stopPropagation?.()
		const wa = contact?.whatsapp
		if (wa) Linking.openURL(`https://wa.me/${wa.replace(/[^0-9]/g, '')}`).catch(() => {})
	}

	const handleEmail = (e: any) => {
		e.stopPropagation?.()
		const email = contact?.email
		if (email) Linking.openURL(`mailto:${email}`).catch(() => {})
	}

	const handleDirections = (e: any) => {
		e.stopPropagation?.()
		openDirections(location, address)
	}

	return (
		<View style={[styles.row, layout === 'column' && styles.column]}>
			{hasPhone && (
				<TouchableOpacity
					onPress={handleCall}
					style={[styles.btn, { backgroundColor: phoneIconColor + '1A', borderColor: phoneIconColor + '38' }]}
					hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
					activeOpacity={0.7}
					accessibilityLabel="Call"
					accessibilityRole="button"
				>
					<Ionicons name="call-outline" size={16} color={phoneIconColor} />
				</TouchableOpacity>
			)}
			{hasWhatsApp && (
				<TouchableOpacity
					onPress={handleWhatsApp}
					style={[styles.btn, styles.btnWhatsApp]}
					hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
					activeOpacity={0.7}
					accessibilityLabel="WhatsApp"
					accessibilityRole="button"
				>
					<Ionicons name="logo-whatsapp" size={16} color="#2DD4BF" />
				</TouchableOpacity>
			)}
			{hasEmail && (
				<TouchableOpacity
					onPress={handleEmail}
					style={[styles.btn, styles.btnEmail]}
					hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
					activeOpacity={0.7}
					accessibilityLabel="Email"
					accessibilityRole="button"
				>
					<Ionicons name="mail-outline" size={16} color="#818CF8" />
				</TouchableOpacity>
			)}
			{hasLocation && (
				<TouchableOpacity
					onPress={handleDirections}
					style={[styles.btn, styles.btnLocation]}
					hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
					activeOpacity={0.7}
					accessibilityLabel="Directions"
					accessibilityRole="button"
				>
					<Ionicons name="navigate-outline" size={16} color="#F59E0B" />
				</TouchableOpacity>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		flexShrink: 0
	},
	column: {
		flexDirection: 'column',
		alignItems: 'center',
		gap: 6,
		flexShrink: 0
	},
	btn: {
		width: 36,
		height: 36,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: StyleSheet.hairlineWidth
	},
	btnWhatsApp: {
		backgroundColor: 'rgba(45, 212, 191, 0.10)',
		borderColor: 'rgba(45, 212, 191, 0.22)'
	},
	btnEmail: {
		backgroundColor: 'rgba(129, 140, 248, 0.10)',
		borderColor: 'rgba(129, 140, 248, 0.22)'
	},
	btnLocation: {
		backgroundColor: 'rgba(245, 158, 11, 0.10)',
		borderColor: 'rgba(245, 158, 11, 0.22)'
	}
})
