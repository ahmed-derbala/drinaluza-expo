import AsyncStorage from '@react-native-async-storage/async-storage'
import { Theme, ServerMode, ServerConfig, LocalServer } from './settings.interface'

export { Theme } from './settings.interface'
import { getServerUrl, getLocalServerUrl, Environment, DEFAULT_LOCAL_URL, DEFAULT_LOCAL_PORT, defaultLocalServers } from '../../config'

export const setTheme = async (theme: Theme) => {
	// Check if we're in a browser environment
	if (typeof window === 'undefined') {
		return // Skip AsyncStorage operations during server-side rendering
	}
	await AsyncStorage.setItem('theme', theme)
}

export const getTheme = async (): Promise<Theme> => {
	// Check if we're in a browser environment
	if (typeof window === 'undefined') {
		return 'dark' // Return default theme for server-side rendering
	}
	const theme = await AsyncStorage.getItem('theme')
	return (theme as Theme) || 'dark'
}

export const setServerConfig = async (config: ServerConfig) => {
	// Check if we're in a browser environment
	if (typeof window === 'undefined') {
		return // Skip AsyncStorage operations during server-side rendering
	}
	await AsyncStorage.setItem('serverConfig', JSON.stringify(config))
}

export const getServerConfig = async (): Promise<ServerConfig> => {
	// Check if we're in a browser environment
	if (typeof window === 'undefined') {
		// Return default config for server-side rendering
		return {
			mode: 'local' as ServerMode,
			localServers: defaultLocalServers,
			selectedLocalServerId: defaultLocalServers[0]?.id || '',
			customUrl: ''
		}
	}

	const config = await AsyncStorage.getItem('serverConfig')
	if (config) {
		const parsedConfig = JSON.parse(config)
		// Ensure localServers is always an array
		if (!parsedConfig.localServers || !Array.isArray(parsedConfig.localServers)) {
			parsedConfig.localServers = defaultLocalServers
		} else {
			// Sync with defaultLocalServers to ensure code changes (like IP updates) are reflected
			const defaultServersMap = new Map(defaultLocalServers.map((s) => [s.id, s]))

			parsedConfig.localServers = parsedConfig.localServers.map((server: LocalServer) => {
				const defaultServer = defaultServersMap.get(server.id)
				if (defaultServer) {
					// Update static properties from code, keep dynamic ones (lastUsed)
					return {
						...server,
						name: defaultServer.name,
						url: defaultServer.url,
						port: defaultServer.port
					}
				}
				return server
			})

			// Add any new default servers that might be missing from storage
			defaultLocalServers.forEach((defaultServer) => {
				if (!parsedConfig.localServers.find((s: LocalServer) => s.id === defaultServer.id)) {
					parsedConfig.localServers.push(defaultServer)
				}
			})
		}
		return parsedConfig
	}
	return {
		mode: 'local',
		customUrl: DEFAULT_LOCAL_URL,
		localServers: defaultLocalServers
	}
}

export const addLocalServer = async (server: Omit<LocalServer, 'id' | 'lastUsed'>): Promise<LocalServer> => {
	const config = await getServerConfig()
	const newServer: LocalServer = {
		...server,
		id: Date.now().toString(),
		lastUsed: Date.now()
	}

	// Ensure localServers is initialized as an array
	if (!config.localServers || !Array.isArray(config.localServers)) {
		config.localServers = []
	}

	// Add to the beginning of the array
	config.localServers.unshift(newServer)

	// Keep only the last 10 servers
	if (config.localServers.length > 10) {
		config.localServers = config.localServers.slice(0, 10)
	}

	await setServerConfig(config)
	return newServer
}

export const updateLocalServer = async (id: string, updates: Partial<Omit<LocalServer, 'id'>>): Promise<void> => {
	const config = await getServerConfig()

	// Ensure localServers is initialized as an array
	if (!config.localServers || !Array.isArray(config.localServers)) {
		config.localServers = []
		return // No servers to update
	}

	const serverIndex = config.localServers.findIndex((server) => server.id === id)

	if (serverIndex !== -1) {
		config.localServers[serverIndex] = {
			...config.localServers[serverIndex],
			...updates,
			lastUsed: Date.now()
		}
		await setServerConfig(config)
	}
}

export const removeLocalServer = async (id: string): Promise<void> => {
	const config = await getServerConfig()

	// Ensure localServers is initialized as an array
	if (!config.localServers || !Array.isArray(config.localServers)) {
		config.localServers = []
		return // No servers to remove
	}

	config.localServers = config.localServers.filter((server) => server.id !== id)
	await setServerConfig(config)
}

export const getBaseUrl = async (): Promise<string> => {
	const config = await getServerConfig()

	switch (config.mode) {
		case 'local':
			// Use the most recently used local server
			// Ensure localServers is initialized as an array
			if (!config.localServers || !Array.isArray(config.localServers)) {
				config.localServers = defaultLocalServers
			}
			const mostRecentServer = config.localServers.sort((a, b) => b.lastUsed - a.lastUsed)[0]
			if (mostRecentServer) {
				return getLocalServerUrl(mostRecentServer.url, mostRecentServer.port)
			}
			// Fallback to default local server
			return getLocalServerUrl(DEFAULT_LOCAL_URL, DEFAULT_LOCAL_PORT)
		case 'development':
			return getServerUrl('development')
		case 'production':
			return getServerUrl('production')
		default:
			return getServerUrl('local')
	}
}
