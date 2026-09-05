/**
 * Media download helper (native + web).
 */

import { Platform } from 'react-native'
import { File, getDocumentDirectory, downloadFile } from '@disk'
import { log } from '@log'

export interface DownloadMediaOptions {
	url: string
	fileName?: string
}

/** Derive a safe local file name from a remote URL. */
const resolveFileName = (url: string, fileName?: string): string => {
	const fallback = url.split('/').pop()?.split('?')[0] || 'media'
	return (fileName || fallback || 'media').replace(/[^a-zA-Z0-9._-]/g, '_')
}

/**
 * Download a media file to the device.
 * On web it triggers a browser download; on native it saves to the document directory.
 * @returns the local uri on native, the source url on web, or null on failure.
 */
export const downloadMediaFile = async ({ url, fileName }: DownloadMediaOptions): Promise<string | null> => {
	if (Platform.OS === 'web') {
		try {
			const anchor = document.createElement('a')
			anchor.href = url
			anchor.download = resolveFileName(url, fileName)
			document.body.appendChild(anchor)
			anchor.click()
			document.body.removeChild(anchor)
			return url
		} catch (error) {
			log({ level: 'error', label: 'smart-media', message: 'Failed to trigger web download', error })
			return null
		}
	}

	try {
		const destination = new File(getDocumentDirectory() as any, resolveFileName(url, fileName))
		const file = await downloadFile(url, destination as any)
		return (file as any)?.uri ?? null
	} catch (error) {
		log({ level: 'error', label: 'smart-media', message: 'Failed to download media file', error })
		return null
	}
}
