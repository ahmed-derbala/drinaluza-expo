import type { MultiLang, Address } from './address.interface'
import { getStringFromMultiLang } from '@/core/ui/languages/languages.helpers'

/**
 * Returns localized street string.
 * Delegates to the single `getStringFromMultiLang` source of truth.
 * If a `localize` (UserContext) is provided it is used first to respect
 * the current `contentLang`; otherwise falls back to global content lang.
 */
export function getStreetString(street?: MultiLang | null, localize?: (name?: MultiLang) => string): string | undefined {
	if (!street) return undefined
	if (localize) {
		const localized = localize(street)
		if (localized) return localized
	}
	const v = getStringFromMultiLang(street)
	return v || undefined
}

/**
 * Formats an Address into a single comma-separated line.
 * Street is localized via optional `localize` fn.
 */
export function formatAddress(address: Address | null | undefined, localize?: (name?: MultiLang) => string): string | null {
	if (!address) return null
	const streetStr = getStreetString(address.street, localize)
	const parts = [streetStr, address.city, address.region, address.country].filter((part): part is string => Boolean(part && String(part).trim()))
	return parts.length > 0 ? parts.join(', ') : null
}
