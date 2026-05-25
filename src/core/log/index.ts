import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { APP_NAME, APP_VERSION } from '../../config'

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export interface LogEntry {
	level?: LogLevel
	label?: string
	error?: any
	message: string
	req?: any
	data?: any
	user?: {
		_id: string
		slug: string
		role: string
	}
}

export interface LogFileInfo {
	name: string
	path: string
	size: number
	mtime?: number
}

const LOGS_DIR = `${FileSystem.documentDirectory}logs/`
const CURRENT_LOG_FILE = `${APP_NAME}-${APP_VERSION}.log`
const CURRENT_LOG_PATH = `${LOGS_DIR}${CURRENT_LOG_FILE}`

// Web in-memory / localStorage backup key
const WEB_LOG_KEY = `drinaluza_logs_${APP_NAME}_${APP_VERSION}`
const MAX_WEB_LOG_LENGTH = 500000 // ~500KB limit

// In-memory queue for logs to prevent synchronous writing bottlenecks
let logQueue: string[] = []
let isWriting = false

const ensureDirectoryExists = async () => {
	if (Platform.OS === 'web') return
	try {
		const dirInfo = await FileSystem.getInfoAsync(LOGS_DIR)
		if (!dirInfo.exists) {
			await FileSystem.makeDirectoryAsync(LOGS_DIR, { intermediates: true })
		}
	} catch (e) {
		console.warn('Failed to create logs directory:', e)
	}
}

const processQueue = async () => {
	if (isWriting || logQueue.length === 0) return
	isWriting = true

	const batch = [...logQueue]
	logQueue = []

	try {
		if (Platform.OS === 'web') {
			if (typeof window !== 'undefined') {
				let existingLogs = localStorage.getItem(WEB_LOG_KEY) || ''
				existingLogs += batch.join('\n') + '\n'
				if (existingLogs.length > MAX_WEB_LOG_LENGTH) {
					// Slice the older logs to stay under size limit
					existingLogs = existingLogs.substring(existingLogs.length - MAX_WEB_LOG_LENGTH)
				}
				localStorage.setItem(WEB_LOG_KEY, existingLogs)
			}
		} else {
			await ensureDirectoryExists()
			const content = batch.join('\n') + '\n'
			const fileInfo = await FileSystem.getInfoAsync(CURRENT_LOG_PATH)
			if (fileInfo.exists) {
				const existingContent = await FileSystem.readAsStringAsync(CURRENT_LOG_PATH)
				await FileSystem.writeAsStringAsync(CURRENT_LOG_PATH, existingContent + content)
			} else {
				await FileSystem.writeAsStringAsync(CURRENT_LOG_PATH, content)
			}
		}
	} catch (e) {
		console.warn('Failed to write log batch:', e)
	} finally {
		isWriting = false
		if (logQueue.length > 0) {
			processQueue()
		}
	}
}

export const log = ({ level = 'info', label, error, message, req, data, user }: LogEntry) => {
	const timestamp = new Date().toISOString()
	const logObject: any = {
		timestamp,
		level,
		message
	}

	if (label) logObject.label = label
	if (user) logObject.user = user
	if (error) {
		logObject.error = {
			message: error.message || String(error),
			stack: error.stack,
			code: error.code,
			status: error.status || error.response?.status
		}
	}
	if (req) logObject.req = req
	if (data) logObject.data = data

	let serialized = ''
	try {
		serialized = JSON.stringify(logObject, null, 2)
	} catch (e) {
		serialized = `[Serialization Error: ${e instanceof Error ? e.message : String(e)}]`
	}

	// Format single line for log file
	const fileLine = `[${timestamp}] [${level.toUpperCase()}]${label ? ` [${label}]` : ''}: ${message}${logObject.error ? ` | Error: ${JSON.stringify(logObject.error)}` : ''}${data ? ` | Data: ${JSON.stringify(data)}` : ''}`
	logQueue.push(fileLine)
	processQueue()

	if (level === 'error') {
		console.error(serialized)
	} else if (level === 'warn') {
		console.warn(serialized)
	} else {
		console.log(serialized)
	}
}

// Get the absolute URI of the current log file
export const getLogFilePath = (): string => {
	if (Platform.OS === 'web') return 'browser-local-storage'
	return CURRENT_LOG_PATH
}

// List all log files
export const listLogFiles = async (): Promise<LogFileInfo[]> => {
	if (Platform.OS === 'web') {
		if (typeof window !== 'undefined') {
			const logs = localStorage.getItem(WEB_LOG_KEY) || ''
			return [
				{
					name: CURRENT_LOG_FILE,
					path: 'browser-local-storage',
					size: logs.length,
					mtime: Date.now()
				}
			]
		}
		return []
	}

	try {
		await ensureDirectoryExists()
		const files = await FileSystem.readDirectoryAsync(LOGS_DIR)
		const list: LogFileInfo[] = []

		for (const name of files) {
			if (name.endsWith('.log')) {
				const path = `${LOGS_DIR}${name}`
				const info = await FileSystem.getInfoAsync(path)
				if (info.exists) {
					list.push({
						name,
						path,
						size: info.size,
						mtime: info.modificationTime
					})
				}
			}
		}

		return list.sort((a, b) => (b.mtime || 0) - (a.mtime || 0))
	} catch (e) {
		console.error('Failed to list log files:', e)
		return []
	}
}

// Read log file content
export const readLogFile = async (name: string = CURRENT_LOG_FILE): Promise<string> => {
	if (Platform.OS === 'web') {
		if (typeof window !== 'undefined') {
			return localStorage.getItem(WEB_LOG_KEY) || 'No logs recorded.'
		}
		return 'Logs unavailable on SSR web environment.'
	}

	try {
		await ensureDirectoryExists()
		const path = `${LOGS_DIR}${name}`
		const info = await FileSystem.getInfoAsync(path)
		if (!info.exists) {
			return `Log file ${name} does not exist.`
		}
		return await FileSystem.readAsStringAsync(path)
	} catch (e) {
		console.error(`Failed to read log file ${name}:`, e)
		return `Error reading log file: ${e instanceof Error ? e.message : String(e)}`
	}
}

// Clear log file content
export const clearLogFile = async (name: string = CURRENT_LOG_FILE): Promise<void> => {
	if (Platform.OS === 'web') {
		if (typeof window !== 'undefined') {
			localStorage.setItem(WEB_LOG_KEY, '')
		}
		return
	}

	try {
		await ensureDirectoryExists()
		const path = `${LOGS_DIR}${name}`
		const info = await FileSystem.getInfoAsync(path)
		if (info.exists) {
			await FileSystem.deleteAsync(path, { idempotent: true })
		}
	} catch (e) {
		console.error(`Failed to clear log file ${name}:`, e)
	}
}

// Share log file on mobile or download on web
export const shareLogFile = async (name: string = CURRENT_LOG_FILE): Promise<void> => {
	if (Platform.OS === 'web') {
		await downloadLogFile(name)
		return
	}

	try {
		await ensureDirectoryExists()
		const path = `${LOGS_DIR}${name}`
		const info = await FileSystem.getInfoAsync(path)
		if (!info.exists) {
			return
		}
		if (await Sharing.isAvailableAsync()) {
			await Sharing.shareAsync(path)
		}
	} catch (e) {
		console.error(`Failed to share log file ${name}:`, e)
	}
}

// Download log file
export const downloadLogFile = async (name: string = CURRENT_LOG_FILE): Promise<void> => {
	try {
		const content = await readLogFile(name)
		if (Platform.OS === 'web') {
			if (typeof window !== 'undefined' && typeof document !== 'undefined') {
				const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
				const url = URL.createObjectURL(blob)
				const link = document.createElement('a')
				link.href = url
				link.download = name
				document.body.appendChild(link)
				link.click()
				document.body.removeChild(link)
				URL.revokeObjectURL(url)
			}
		} else {
			await shareLogFile(name)
		}
	} catch (e) {
		console.error(`Failed to download log file ${name}:`, e)
	}
}
