import { Linking, Platform } from 'react-native'
import { formatAddress, getStreetString, type Address, type MultiLang } from '@address'

export type LocationLike =
	| {
			geo?: { coordinates?: number[] }
			coordinates?: number[]
			type?: string
	  }
	| null
	| undefined

export type { Address, MultiLang }
export { formatAddress, getStreetString }

/** Returns [longitude, latitude] from either nested or legacy location shapes. */
export function getGeoCoordinates(location: LocationLike): [number, number] | null {
	const coords = location?.geo?.coordinates ?? location?.coordinates
	if (!Array.isArray(coords) || coords.length !== 2) return null
	const [lng, lat] = coords
	if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
	return [lng, lat]
}

function buildCoordinatesDirectionsUrl(lat: number, lng: number): string {
	return (
		Platform.select({
			ios: `maps:?daddr=${lat},${lng}`,
			android: `google.navigation:q=${lat},${lng}`,
			default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
		}) ?? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
	)
}

function buildAddressDirectionsUrl(address: string): string {
	const encoded = encodeURIComponent(address)
	return (
		Platform.select({
			ios: `maps:?daddr=${encoded}`,
			android: `google.navigation:q=${encoded}`,
			default: `https://www.google.com/maps/dir/?api=1&destination=${encoded}`
		}) ?? `https://www.google.com/maps/dir/?api=1&destination=${encoded}`
	)
}

/** Opens turn-by-turn directions, preferring GPS coordinates over a text address. */
export function openDirections(location: LocationLike, address?: Address | null | undefined): boolean {
	const coords = getGeoCoordinates(location)
	if (coords) {
		const [lng, lat] = coords
		Linking.openURL(buildCoordinatesDirectionsUrl(lat, lng)).catch(() => {})
		return true
	}

	const formattedAddress = formatAddress(address)
	if (formattedAddress) {
		Linking.openURL(buildAddressDirectionsUrl(formattedAddress)).catch(() => {})
		return true
	}

	return false
}

export function hasDirectionsTarget(location: LocationLike, address?: Address | null | undefined): boolean {
	return !!getGeoCoordinates(location) || !!formatAddress(address)
}
