export interface LogParams {
	level: 'info' | 'warn' | 'error' | 'debug'
	label: string
	message?: string
	error?: any
	data?: any
}

/**
 * Premium ANSI-colored logger module for Expo, React Native, and Web.
 * Disabled completely in production environments.
 */
export const log = ({ level, label, message = '', error, data }: LogParams) => {
	// Disable all logs in production
	if (!__DEV__) return

	// Premium ANSI colors for high terminal readability in Metro/Expo
	const colors = {
		info: '\x1b[36m', // Cyan
		warn: '\x1b[33m', // Yellow
		error: '\x1b[31m', // Red
		debug: '\x1b[90m', // Dark Gray
		reset: '\x1b[0m',
		bold: '\x1b[1m'
	}

	const levelBadge = level.toUpperCase()
	const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false })
	const levelColor = colors[level] || colors.reset

	// Format Prefix: "[12:34:56 AM/PM] [LEVEL] [label]"
	const prefix = `${colors.bold}[${timestamp}]${colors.reset} ${levelColor}${colors.bold}[${levelBadge}]${colors.reset} ${levelColor}[${label}]${colors.reset}`

	const outputArgs: any[] = []
	if (message) {
		outputArgs.push(`${prefix} ${colors.bold}${message}${colors.reset}`)
	} else {
		outputArgs.push(prefix)
	}

	if (data !== undefined) {
		outputArgs.push('\n  Data:', data)
	}

	if (error !== undefined) {
		outputArgs.push('\n  Error:', error)
	}

	// Route to correct standard console methods
	if (level === 'error') {
		console.error(...outputArgs)
	} else if (level === 'warn') {
		console.warn(...outputArgs)
	} else {
		console.log(...outputArgs)
	}
}
