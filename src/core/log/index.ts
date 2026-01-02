export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export interface LogEntry {
	level?: LogLevel
	label?: string
	error?: any
	message: string
	req?: any
	data?: any
}

export const log = ({ level = 'info', label, error, message, req, data }: LogEntry) => {
	const timestamp = new Date().toISOString()
	const logObject: any = {
		timestamp,
		level,
		message
	}

	if (label) logObject.label = label
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
