import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../theme'

// --- TYPES ---
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastAction {
	label?: string
	onPress: () => void
	color?: string
	icon?: keyof typeof Ionicons.glyphMap
}

export interface ToastProps {
	visible: boolean
	message: string
	type?: ToastType
	duration?: number
	onHide: () => void
	actions?: ToastAction[]
	onPress?: () => void
}

interface ToastState {
	visible: boolean
	message: string
	type: ToastType
	duration: number
	actions: ToastAction[]
	onPress?: () => void
}

interface ToastContextData {
	showToast: (options: { message: string; type?: ToastType; duration?: number; actions?: ToastAction[]; onPress?: () => void }) => void
	hideToast: () => void
	success: (message: string, duration?: number) => void
	error: (message: string, duration?: number) => void
	warning: (message: string, duration?: number) => void
	info: (message: string, duration?: number) => void
}

// --- GLOBAL HELPER ---
type ShowToastFn = (options: { message: string; type?: ToastType; duration?: number; actions?: ToastAction[]; onPress?: () => void }) => void
let showToastRef: ShowToastFn | null = null

const show = (options: { message: string; type?: ToastType; duration?: number; actions?: ToastAction[]; onPress?: () => void }) => {
	if (showToastRef) {
		showToastRef(options)
	} else {
		console.warn('Toast helper called before Provider was registered')
	}
}

export const toast = {
	show,
	success: (message: string, options?: Omit<Parameters<typeof show>[0], 'message' | 'type'>) => show({ message, type: 'success', ...options }),
	error: (message: string, options?: Omit<Parameters<typeof show>[0], 'message' | 'type'>) => show({ message, type: 'error', ...options }),
	warning: (message: string, options?: Omit<Parameters<typeof show>[0], 'message' | 'type'>) => show({ message, type: 'warning', ...options }),
	info: (message: string, options?: Omit<Parameters<typeof show>[0], 'message' | 'type'>) => show({ message, type: 'info', ...options })
}

// --- CONTEXT ---
const ToastContext = createContext<ToastContextData>({} as ToastContextData)

export const useToast = () => {
	const context = useContext(ToastContext)
	if (!context) {
		throw new Error('useToast must be used within a ToastProvider')
	}
	return context
}

// --- UI COMPONENT ---
const TAB_BAR_HEIGHT =
	Platform.select({
		ios: 60,
		android: 70,
		web: 70
	}) || 70

function ToastComponent({ visible, message, type = 'info', duration = 3000, onHide, actions = [], onPress }: ToastProps) {
	const { colors } = useTheme()
	const translateY = useRef(new Animated.Value(100)).current
	const opacity = useRef(new Animated.Value(0)).current

	useEffect(() => {
		if (visible) {
			Animated.parallel([
				Animated.timing(translateY, {
					toValue: 0,
					duration: 350,
					useNativeDriver: true
				}),
				Animated.timing(opacity, {
					toValue: 1,
					duration: 350,
					useNativeDriver: true
				})
			]).start()

			if (duration > 0) {
				const timer = setTimeout(() => {
					hideToast()
				}, duration)
				return () => clearTimeout(timer)
			}
		} else {
			hideToast()
		}
	}, [visible])

	const hideToast = () => {
		Animated.parallel([
			Animated.timing(translateY, {
				toValue: 20,
				duration: 300,
				useNativeDriver: true
			}),
			Animated.timing(opacity, {
				toValue: 0,
				duration: 300,
				useNativeDriver: true
			})
		]).start(() => {
			onHide()
		})
	}

	const getIconName = (): keyof typeof Ionicons.glyphMap => {
		switch (type) {
			case 'success':
				return 'checkmark-circle'
			case 'error':
				return 'alert-circle'
			case 'warning':
				return 'warning'
			case 'info':
			default:
				return 'information-circle'
		}
	}

	const getBackgroundColor = () => {
		switch (type) {
			case 'success':
				return colors.success || '#10B981'
			case 'error':
				return colors.error || '#EF4444'
			case 'warning':
				return colors.warning || '#F59E0B'
			case 'info':
			default:
				return colors.info || '#3B82F6'
		}
	}

	if (!visible && (opacity as any)._value === 0) return null

	return (
		<Animated.View
			style={[
				styles.container,
				{
					transform: [{ translateY }],
					opacity,
					backgroundColor: getBackgroundColor()
				}
			]}
		>
			<TouchableOpacity
				activeOpacity={onPress ? 0.8 : 1}
				onPress={() => {
					if (onPress) {
						onPress()
						hideToast()
					}
				}}
				style={styles.content}
			>
				<View style={styles.header}>
					<View style={styles.mainInfo}>
						<Ionicons name={getIconName()} size={24} color="#fff" />
						<Text style={styles.message} numberOfLines={3}>
							{message}
						</Text>
					</View>
					<TouchableOpacity
						onPress={(e) => {
							e.stopPropagation()
							hideToast()
						}}
						style={styles.closeButton}
					>
						<Ionicons name="close" size={20} color="#fff" />
					</TouchableOpacity>
				</View>

				{actions.length > 0 && (
					<View style={styles.actionsContainer}>
						{actions.map((action, index) => (
							<TouchableOpacity
								key={index}
								onPress={(e) => {
									e.stopPropagation()
									action.onPress()
									hideToast()
								}}
								style={[styles.actionButton, !action.label && { paddingHorizontal: 10, paddingVertical: 10 }]}
							>
								{action.icon && <Ionicons name={action.icon} size={action.label ? 16 : 22} color={action.color || '#fff'} style={action.label ? { marginRight: 6 } : {}} />}
								{action.label && <Text style={[styles.actionLabel, action.color ? { color: action.color } : null]}>{action.label}</Text>}
							</TouchableOpacity>
						))}
					</View>
				)}
			</TouchableOpacity>
		</Animated.View>
	)
}

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		bottom: TAB_BAR_HEIGHT + 16,
		left: 16,
		right: 16,
		borderRadius: 18,
		zIndex: 10000,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 6 },
				shadowOpacity: 0.35,
				shadowRadius: 12
			},
			android: {
				elevation: 12
			},
			web: {
				boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
				maxWidth: 500,
				alignSelf: 'center',
				left: 'auto',
				right: 'auto',
				width: '90%'
			}
		})
	},
	content: {
		padding: 14,
		gap: 10
	},
	header: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		gap: 12
	},
	mainInfo: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12
	},
	message: {
		flex: 1,
		fontSize: 15,
		fontWeight: '600',
		color: '#fff',
		lineHeight: 20
	},
	closeButton: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: 'rgba(255, 255, 255, 0.15)',
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: -2
	},
	actionsContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-end',
		gap: 10,
		marginTop: 4,
		borderTopWidth: 1,
		borderTopColor: 'rgba(255, 255, 255, 0.2)',
		paddingTop: 10
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 10,
		backgroundColor: 'rgba(255, 255, 255, 0.25)'
	},
	actionLabel: {
		fontSize: 13,
		fontWeight: '700',
		color: '#fff',
		letterSpacing: 0.5
	}
})

// --- PROVIDER ---
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [state, setState] = useState<ToastState>({
		visible: false,
		message: '',
		type: 'info',
		duration: 3000,
		actions: [],
		onPress: undefined
	})

	const hideToast = useCallback(() => {
		setState((prev) => ({ ...prev, visible: false }))
	}, [])

	const showToast = useCallback((options: { message: string; type?: ToastType; duration?: number; actions?: ToastAction[]; onPress?: () => void }) => {
		setState({
			visible: true,
			message: options.message,
			type: options.type || 'info',
			duration: options.duration ?? 3000,
			actions: options.actions || [],
			onPress: options.onPress
		})
	}, [])

	useEffect(() => {
		showToastRef = showToast
	}, [showToast])

	const success = useCallback((message: string, duration?: number) => showToast({ message, type: 'success', duration }), [showToast])
	const error = useCallback((message: string, duration?: number) => showToast({ message, type: 'error', duration }), [showToast])
	const warning = useCallback((message: string, duration?: number) => showToast({ message, type: 'warning', duration }), [showToast])
	const info = useCallback((message: string, duration?: number) => showToast({ message, type: 'info', duration }), [showToast])

	return (
		<ToastContext.Provider value={{ showToast, hideToast, success, error, warning, info }}>
			{children}
			<ToastComponent visible={state.visible} message={state.message} type={state.type} duration={state.duration} actions={state.actions} onPress={state.onPress} onHide={hideToast} />
		</ToastContext.Provider>
	)
}
