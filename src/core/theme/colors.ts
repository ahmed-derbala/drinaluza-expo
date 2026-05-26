import { AppThemeColors } from './types'

export const lightColors: AppThemeColors = {
	primary: '#0284C7',
	background: '#FFFFFF',
	card: '#FFFFFF',
	text: '#0F172A',
	border: '#E2E8F0',
	notification: '#E11D48',
	primaryContainer: '#E0F2FE',
	surface: '#FFFFFF',
	surfaceVariant: '#F1F5F9',
	modalOverlay: 'rgba(15, 23, 42, 0.5)',
	error: '#DC2626',
	success: '#059669',
	warning: '#D97706',
	info: '#2563EB',
	buttonText: '#FFFFFF',
	textSecondary: '#475569',
	textTertiary: '#94A3B8',
	borderLight: '#F1F5F9',
	textOnPrimary: '#FFFFFF',
	inputBorder: '#CBD5E1'
}

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

// Static export for legacy compatibility or background splash styling
export const colors = darkColors
