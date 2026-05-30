import { AppThemeColors } from './types'

export const darkColors: AppThemeColors = {
	primary: '#0EA5E9',
	background: '#000000',
	card: '#1C2541',
	text: '#F8FAFC',
	border: '#3A506B',
	notification: '#F43F5E',
	primaryContainer: '#0EA5E920',
	surface: '#1C2541',
	surfaceVariant: '#3A506B30',
	modalOverlay: 'rgba(3, 7, 18, 0.75)',
	error: '#EF4444',
	success: '#10B981',
	warning: '#F59E0B',
	info: '#3B82F6',
	buttonText: '#FFFFFF',
	textSecondary: '#94A3B8',
	textTertiary: '#64748B',
	borderLight: '#1E293B',
	textOnPrimary: '#FFFFFF',
	inputBorder: '#334155'
}

export const lightColors: AppThemeColors = darkColors

// Static export for legacy compatibility or background splash styling
export const colors = darkColors
