import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import Toast, { ToastType, ToastAction } from '@/components/common/Toast'
import { registerToast } from '@/core/helpers/toast'

interface ToastState {
	visible: boolean
	message: string
	type: ToastType
	duration: number
	actions: ToastAction[]
}

interface ToastContextData {
	showToast: (options: { message: string; type?: ToastType; duration?: number; actions?: ToastAction[] }) => void
	hideToast: () => void
	success: (message: string, duration?: number) => void
	error: (message: string, duration?: number) => void
	warning: (message: string, duration?: number) => void
	info: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData)

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [state, setState] = useState<ToastState>({
		visible: false,
		message: '',
		type: 'info',
		duration: 3000,
		actions: []
	})

	const hideToast = useCallback(() => {
		setState((prev) => ({ ...prev, visible: false }))
	}, [])

	const showToast = useCallback((options: { message: string; type?: ToastType; duration?: number; actions?: ToastAction[] }) => {
		setState({
			visible: true,
			message: options.message,
			type: options.type || 'info',
			duration: options.duration ?? 3000,
			actions: options.actions || []
		})
	}, [])

	useEffect(() => {
		registerToast(showToast)
	}, [showToast])

	const success = useCallback((message: string, duration?: number) => showToast({ message, type: 'success', duration }), [showToast])
	const error = useCallback((message: string, duration?: number) => showToast({ message, type: 'error', duration }), [showToast])
	const warning = useCallback((message: string, duration?: number) => showToast({ message, type: 'warning', duration }), [showToast])
	const info = useCallback((message: string, duration?: number) => showToast({ message, type: 'info', duration }), [showToast])

	return (
		<ToastContext.Provider value={{ showToast, hideToast, success, error, warning, info }}>
			{children}
			<Toast visible={state.visible} message={state.message} type={state.type} duration={state.duration} actions={state.actions} onHide={hideToast} />
		</ToastContext.Provider>
	)
}

export const useToast = () => {
	const context = useContext(ToastContext)
	if (!context) {
		throw new Error('useToast must be used within a ToastProvider')
	}
	return context
}
