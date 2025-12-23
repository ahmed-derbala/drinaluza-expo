export type Theme = 'light' | 'dark' | 'system'

export type ServerMode = 'local' | 'development' | 'production'

export interface LocalServer {
	id: string
	name: string
	url: string
	port?: number
	lastUsed: number
}

export interface ServerConfig {
	mode: ServerMode
	customUrl?: string
	localServers: LocalServer[]
	selectedLocalServerId?: string
}
