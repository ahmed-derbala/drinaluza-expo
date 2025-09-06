import AsyncStorage from '@react-native-async-storage/async-storage'
import { Theme, ServerMode, ServerConfig, LocalServer } from './settings.interface'
import { getApiUrl, getLocalApiUrl, defaultLocalServers, Environment } from '@/core/config'

export const setTheme = async (theme: Theme) => {
	await AsyncStorage.setItem('theme', theme)
}

export const getTheme = async (): Promise<Theme> => {
	const theme = await AsyncStorage.getItem('theme')
	return (theme as Theme) || 'dark'
}

export const setServerConfig = async (config: ServerConfig) => {
	await AsyncStorage.setItem('serverConfig', JSON.stringify(config))
}

export const getServerConfig = async (): Promise<ServerConfig> => {
	const config = await AsyncStorage.getItem('serverConfig')
	if (config) {
		return JSON.parse(config)
	}
	return {
		mode: 'local',
		customUrl: '10.173.243.120',
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
	config.localServers = config.localServers.filter((server) => server.id !== id)
	await setServerConfig(config)
}

export const getBaseUrl = async (): Promise<string> => {
	const config = await getServerConfig()

	switch (config.mode) {
		case 'local':
			// Use the most recently used local server
			const mostRecentServer = config.localServers.sort((a, b) => b.lastUsed - a.lastUsed)[0]
			if (mostRecentServer) {
				return getLocalApiUrl(mostRecentServer.url, mostRecentServer.port)
			}
			// Fallback to default local server
			return getLocalApiUrl('10.173.243.120', 5001)
		case 'development':
			return getApiUrl('development')
		case 'production':
			return getApiUrl('production')
		default:
			return getApiUrl('local')
	}
}
