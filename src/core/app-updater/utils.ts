export interface ParsedVersion {
	major: number
	minor: number
	patch: number
}

export interface UpdateInfo {
	name: string
	published_at: string
	latest_version: string
	size: number
	download_count: number
	changelog: string
	download_url: string
}

/**
 * Parses a version string formatted as MAJOR.MINOR.PATCH into its components.
 * Handles optional leading 'v' and whitespace.
 */
export const parseVersion = (versionStr: string): ParsedVersion | null => {
	if (!versionStr) return null
	const clean = versionStr.trim().replace(/^v/, '')
	const parts = clean.split('.').map((p) => parseInt(p, 10))
	if (parts.length < 3 || parts.some(isNaN)) {
		return null
	}
	return {
		major: parts[0],
		minor: parts[1],
		patch: parts[2]
	}
}

/**
 * Compares current version with the latest version using semantic version rules.
 * Rules:
 * - If different MAJOR version: REQUIRED update.
 * - If same MAJOR version but a higher MINOR version: REQUIRED update.
 * - If only the PATCH version is higher: OPTIONAL update.
 * - Otherwise: none (no update).
 */
export const compareVersions = (current: string, latest: string): 'required' | 'optional' | 'none' => {
	const curr = parseVersion(current)
	const late = parseVersion(latest)

	if (!curr || !late) return 'none'

	if (late.major > curr.major) {
		return 'required'
	} else if (late.major === curr.major) {
		if (late.minor > curr.minor) {
			return 'required'
		} else if (late.minor === curr.minor) {
			if (late.patch > curr.patch) {
				return 'optional'
			}
		}
	}

	return 'none'
}

/**
 * Fetches update information from the specified config.UPDATE_CHECK_URL
 * and parses it into the target object structure.
 */
export const fetchUpdateFromUrl = async (url: string, timeoutMs: number = 60000): Promise<UpdateInfo> => {
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), timeoutMs)

	try {
		const res = await fetch(url, { signal: controller.signal })
		if (!res.ok) {
			throw new Error(`Fetch failed with status ${res.status}: ${res.statusText}`)
		}
		const data = await res.json()
		clearTimeout(timer)

		// Find the APK asset or fallback to the first asset
		const apkAsset =
			data.assets?.find((a: any) => {
				const name = a.name?.toLowerCase() || ''
				return name.endsWith('.apk') || a.content_type === 'application/vnd.android.package-archive'
			}) || data.assets?.[0]

		return {
			name: data.name || data.tag_name || 'New Update',
			published_at: data.published_at || new Date().toISOString(),
			latest_version: data.tag_name || '',
			size: apkAsset?.size || 0,
			download_count: apkAsset?.download_count || 0,
			changelog: data.body || '',
			download_url: apkAsset?.browser_download_url || ''
		}
	} catch (err) {
		clearTimeout(timer)
		throw err
	}
}
