import { ParsedRelease, UpdateType } from './types'

/**
 * Parses a semantic version string (e.g. "1.2.3" or "v1.16.2") into parts.
 */
export function parseVersion(versionStr: string): { major: number; minor: number; patch: number } | null {
	if (!versionStr) return null

	// Strip leading 'v' if present
	const clean = versionStr.startsWith('v') ? versionStr.substring(1) : versionStr
	const parts = clean.split('.')

	if (parts.length < 3) return null

	const major = parseInt(parts[0], 10)
	const minor = parseInt(parts[1], 10)
	const patch = parseInt(parts[2], 10)

	if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
		return null
	}

	return { major, minor, patch }
}

/**
 * Compares two semantic version strings.
 * Returns:
 *   -1 if v1 < v2
 *    0 if v1 === v2
 *    1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
	const parsed1 = parseVersion(v1)
	const parsed2 = parseVersion(v2)

	if (!parsed1 && !parsed2) return 0
	if (!parsed1) return -1
	if (!parsed2) return 1

	if (parsed1.major !== parsed2.major) {
		return parsed1.major < parsed2.major ? -1 : 1
	}

	if (parsed1.minor !== parsed2.minor) {
		return parsed1.minor < parsed2.minor ? -1 : 1
	}

	if (parsed1.patch !== parsed2.patch) {
		return parsed1.patch < parsed2.patch ? -1 : 1
	}

	return 0
}

/**
 * Determines update type using custom rules:
 * - Different MAJOR version -> REQUIRED
 * - Same MAJOR, higher MINOR version -> REQUIRED
 * - Same MAJOR, same MINOR, higher PATCH -> OPTIONAL
 * - Lower or equal -> NONE
 */
export function determineUpdateType(currentStr: string, latestStr: string): UpdateType {
	const current = parseVersion(currentStr)
	const latest = parseVersion(latestStr)

	if (!current || !latest) return 'none'

	if (latest.major > current.major) {
		return 'required'
	}
	if (latest.major < current.major) {
		return 'none'
	}

	// Same major
	if (latest.minor > current.minor) {
		return 'required'
	}
	if (latest.minor < current.minor) {
		return 'none'
	}

	// Same major & minor
	if (latest.patch > current.patch) {
		return 'optional'
	}

	return 'none'
}

/**
 * Parses the GitHub release endpoint response payload to match standard updater object
 */
export function parseReleaseResponse(data: any): ParsedRelease | null {
	if (!data || !data.tag_name) {
		return null
	}

	const latestVersion = data.tag_name
	const name = data.name || `Release ${latestVersion}`
	const publishedAt = data.published_at || new Date().toISOString()
	const changelog = data.body || ''

	// Find APK asset on Android, otherwise fallback to the first asset or the release URL
	let size = 0
	let downloadCount = 0
	let downloadUrl = data.html_url || ''

	if (Array.isArray(data.assets) && data.assets.length > 0) {
		const apkAsset = data.assets.find((asset: any) => (asset.name && asset.name.endsWith('.apk')) || asset.content_type === 'application/vnd.android.package-archive')

		const targetAsset = apkAsset || data.assets[0]
		if (targetAsset) {
			size = targetAsset.size || 0
			downloadCount = targetAsset.download_count || 0
			downloadUrl = targetAsset.browser_download_url || targetAsset.url || ''
		}
	}

	return {
		name,
		published_at: publishedAt,
		latest_version: latestVersion,
		size,
		download_count: downloadCount,
		changelog,
		download_url: downloadUrl
	}
}
