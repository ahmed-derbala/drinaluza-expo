// Simple event emitter for auth state management
type AuthModalListener = (show: boolean, message?: string) => void

class AuthStateManager {
	private listeners: Set<AuthModalListener> = new Set()

	subscribe(listener: AuthModalListener) {
		this.listeners.add(listener)
		return () => {
			this.listeners.delete(listener)
		}
	}

	showAuthModal(message?: string) {
		this.listeners.forEach((listener) => listener(true, message))
	}

	hideAuthModal() {
		this.listeners.forEach((listener) => listener(false))
	}
}

export const authStateManager = new AuthStateManager()
