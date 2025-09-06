export type Environment = 'local' | 'development' | 'production'

export interface ServerConfig {
	baseUrl: string
	apiPath: string
	timeout: number
	retryAttempts: number
}

export interface AppConfig {
	name: string
	version: string
	environment: Environment
	server: ServerConfig
	features: {
		enableLogging: boolean
		enableAnalytics: boolean
		enableCrashReporting: boolean
	}
}

// Default configurations for each environment
const configs: Record<Environment, AppConfig> = {
	local: {
		name: 'Drinaluza',
		version: '1.0.0',
		environment: 'local',
		server: {
			baseUrl: 'http://192.168.1.15',
			apiPath: '/api',
			timeout: 10000,
			retryAttempts: 3
		},
		features: {
			enableLogging: true,
			enableAnalytics: false,
			enableCrashReporting: false
		}
	},
	development: {
		name: 'Drinaluza',
		version: '1.0.0',
		environment: 'development',
		server: {
			baseUrl: 'https://dev.drinaluza.com',
			apiPath: '/api',
			timeout: 15000,
			retryAttempts: 3
		},
		features: {
			enableLogging: true,
			enableAnalytics: true,
			enableCrashReporting: false
		}
	},
	production: {
		name: 'Drinaluza',
		version: '1.0.0',
		environment: 'production',
		server: {
			baseUrl: 'https://drinaluza.com',
			apiPath: '/api',
			timeout: 20000,
			retryAttempts: 5
		},
		features: {
			enableLogging: false,
			enableAnalytics: true,
			enableCrashReporting: true
		}
	}
}

// Default local server configurations
export const defaultLocalServers = [
	{
		id: 'default',
		name: 'Default Local',
		url: '192.168.1.15',
		port: 5001,
		lastUsed: Date.now()
	},
	{
		id: 'backup',
		name: 'Backup Local',
		url: '192.168.1.15',
		port: 5001,
		lastUsed: Date.now() - 86400000 // 1 day ago
	}
]

// Get configuration for a specific environment
export const getConfig = (environment: Environment): AppConfig => {
	return configs[environment]
}

// Get the full API URL for a specific environment
export const getApiUrl = (environment: Environment): string => {
	const config = getConfig(environment)
	return `${config.server.baseUrl}${config.server.apiPath}`
}

// Get the full API URL for local environment with custom server details
export const getLocalApiUrl = (url: string, port: number): string => {
	return `http://${url}:${port}/api`
}

// Default environment (can be changed based on build process)
export const DEFAULT_ENVIRONMENT: Environment = 'local'

// Export the default configuration
export const defaultConfig = getConfig(DEFAULT_ENVIRONMENT)

// Utility function to get current environment from server config
export const getCurrentEnvironment = (serverMode: string): Environment => {
	switch (serverMode) {
		case 'local':
			return 'local'
		case 'development':
			return 'development'
		case 'production':
			return 'production'
		default:
			return 'local'
	}
}

// Utility function to get server configuration for a specific environment
export const getServerConfigForEnvironment = (environment: Environment) => {
	return getConfig(environment).server
}
