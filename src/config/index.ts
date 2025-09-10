// Configuration file for Drinaluza app
// Edit server URLs and ports here for different environments

export type Environment = 'local' | 'development' | 'production'

export interface ServerEnvironment {
	url: string
	port: number
}

export interface AppConfig {
	servers: {
		local: ServerEnvironment
		development: ServerEnvironment
		production: ServerEnvironment
	}
	app: {
		name: string
		version: string
		timeout: number
		retryAttempts: number
	}
}

// Main configuration - edit these values as needed
export const config: AppConfig = {
	servers: {
		local: {
			url: '192.168.1.15',
			port: 5001
		},
		development: {
			url: '192.168.1.148',
			port: 5001
		},
		production: {
			url: '192.168.1.148',
			port: 5001
		}
	},
	app: {
		name: 'Drinaluza',
		version: '1.0.0',
		timeout: 10000, // 10 seconds
		retryAttempts: 3
	}
}

// Helper functions to get server URLs
export const getServerUrl = (environment: Environment): string => {
	const server = config.servers[environment]
	//const protocol = environment === 'local' ? 'http' : 'http'
	const protocol = 'http'
	return `${protocol}://${server.url}:${server.port}/api`
}

export const getLocalServerUrl = (url: string, port: number): string => {
	return `http://${url}:${port}/api`
}

// Get server configuration for a specific environment
export const getServerConfig = (environment: Environment): ServerEnvironment => {
	return config.servers[environment]
}

// Update server configuration at runtime
export const updateServerConfig = (environment: Environment, url: string, port: number): void => {
	config.servers[environment] = { url, port }
}

// Default values for easy access
export const DEFAULT_LOCAL_URL = config.servers.local.url
export const DEFAULT_LOCAL_PORT = config.servers.local.port
export const DEFAULT_DEV_URL = config.servers.development.url
export const DEFAULT_DEV_PORT = config.servers.development.port
export const DEFAULT_PROD_URL = config.servers.production.url
export const DEFAULT_PROD_PORT = config.servers.production.port

// Default local servers array
export const defaultLocalServers = [
	{
		id: '1',
		name: '4G',
		url: '10.173.243.120',
		port: DEFAULT_LOCAL_PORT,
		lastUsed: Date.now()
	},
	{
		id: '2',
		name: 'aroma',
		url: '192.168.1.148',
		port: DEFAULT_LOCAL_PORT,
		lastUsed: Date.now()
	},
	{
		id: '3',
		name: 'wifi',
		url: '192.168.1.15',
		port: DEFAULT_LOCAL_PORT,
		lastUsed: Date.now()
	}
]

// App configuration
export const APP_NAME = config.app.name
export const APP_VERSION = config.app.version
export const API_TIMEOUT = config.app.timeout
export const RETRY_ATTEMPTS = config.app.retryAttempts
