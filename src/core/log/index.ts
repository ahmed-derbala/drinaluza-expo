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
			message: error.message || error,
			stack: error.stack,
			...error
		}
	}
	if (req) logObject.req = req
	if (data) logObject.data = data

	if (level === 'error') {
		console.error(JSON.stringify(logObject, null, 2))
	} else if (level === 'warn') {
		console.warn(JSON.stringify(logObject, null, 2))
	} else {
		console.log(JSON.stringify(logObject, null, 2))
	}
}
