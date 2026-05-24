type LogLevel = 'info' | 'warn' | 'error' | 'debug'

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
		// Fallback in case of stringify failures (e.g. cyclic references)
		serialized = `[Serialization Error: ${e instanceof Error ? e.message : String(e)}]`
	}

	if (level === 'error') {
		console.error(serialized)
	} else if (level === 'warn') {
		console.warn(serialized)
	} else {
		console.log(serialized)
	}
}
