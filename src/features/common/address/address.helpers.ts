import type { LocalizedName, Address } from './address.interface'
import { localizeName } from '@/core/translation'

/**
 * Returns localized street string.
 * If a `localize` function (e.g. from UserContext) is provided, it is used first
 * to respect the user's content language. Falls back to global localizeName.
 */
export function getStreetString(street?: LocalizedName | null, localize?: (name?: LocalizedName) => string): string | undefined {
	if (!street) return undefined
	if (localize) {
		const localized = localize(street)
		if (localized) return localized
	}
	const globalLocalized = localizeName(street)
	if (globalLocalized) return globalLocalized
	return street.en || street.tn_latn || street.tn_arab || undefined
}

/**
 * Formats an Address into a single comma-separated line.
 * Street is localized via optional `localize` fn.
 */
export function formatAddress(address: Address | null | undefined, localize?: (name?: LocalizedName) => string): string | null {
	if (!address) return null
	const streetStr = getStreetString(address.street, localize)
	const parts = [streetStr, address.city, address.region, address.country].filter((part): part is string => Boolean(part && String(part).trim()))
	return parts.length > 0 ? parts.join(', ') : null
}
