import { createContext, useContext, useEffect, useState } from 'react'
import { Appearance, StyleSheet } from 'react-native'
import { ReactNode } from 'react'

interface ThemeContextType {
	theme: 'light' | 'dark' | 'system'
	setTheme: (theme: 'light' | 'dark' | 'system') => void
	themeStyles: {
		background: { backgroundColor: string }
		text: { color: string }
		input: {
			borderColor: string
			backgroundColor: string
			color: string
			placeholderTextColor: string
		}
		card: {
			backgroundColor: string
			borderColor: string
		}
	}
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
	const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark')
	const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('dark')

	useEffect(() => {
		if (theme === 'system') {
			const systemColorScheme = Appearance.getColorScheme() || 'dark'
			setColorScheme(systemColorScheme)
		} else {
			setColorScheme(theme)
		}
	}, [theme])

	useEffect(() => {
		const subscription = Appearance.addChangeListener(({ colorScheme }) => {
			if (theme === 'system') {
				setColorScheme(colorScheme || 'dark')
			}
		})
		return () => subscription.remove()
	}, [theme])

	const themeStyles = StyleSheet.create({
		background: {
			backgroundColor: colorScheme === 'dark' ? '#1c2526' : '#ffffff'
		},
		text: {
			color: colorScheme === 'dark' ? '#ffffff' : '#000000'
		},
		input: {
			borderColor: colorScheme === 'dark' ? '#4a6266' : '#cccccc',
			backgroundColor: colorScheme === 'dark' ? '#2e3b3d' : '#f5f5f5',
			color: colorScheme === 'dark' ? '#ffffff' : '#000000',
			placeholderTextColor: colorScheme === 'dark' ? '#8a9a9c' : '#999999'
		},
		card: {
			backgroundColor: colorScheme === 'dark' ? '#2e3b3d' : '#f5f5f5',
			borderColor: colorScheme === 'dark' ? '#4a6266' : '#cccccc'
		}
	})

	return <ThemeContext.Provider value={{ theme, setTheme, themeStyles }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
	const context = useContext(ThemeContext)
	if (!context) {
		throw new Error('useTheme must be used within a ThemeProvider')
	}
	return context
}
