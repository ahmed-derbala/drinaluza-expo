import { Linking, Platform } from 'react-native'

export type LocationLike =
	| {
			geo?: { coordinates?: number[] }
			coordinates?: number[]
			type?: string
	  }
	| null
	| undefined

export type AddressLike =
	| {
			street?: string
			city?: string
			state?: string
			region?: string
			country?: string
	  }
	| null
	| undefined

/** Returns [longitude, latitude] from either nested or legacy location shapes. */
export function getGeoCoordinates(location: LocationLike): [number, number] | null {
	const coords = location?.geo?.coordinates ?? location?.coordinates
	if (!Array.isArray(coords) || coords.length !== 2) return null
	const [lng, lat] = coords
	if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
	return [lng, lat]
}

export function formatAddress(address: AddressLike): string | null {
	if (!address) return null
	const parts = [address.street, address.city, address.state ?? address.region, address.country].filter(Boolean)
	return parts.length > 0 ? parts.join(', ') : null
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
export function openDirections(location: LocationLike, address?: AddressLike): boolean {
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

export function hasDirectionsTarget(location: LocationLike, address?: AddressLike): boolean {
	return !!getGeoCoordinates(location) || !!formatAddress(address)
}
