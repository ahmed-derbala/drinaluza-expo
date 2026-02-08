import React, { Component, ReactNode } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'

interface Props {
	children: ReactNode
	fallback?: ReactNode
}

interface State {
	hasError: boolean
	error?: Error
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20
	},
	errorText: {
		fontSize: 16,
		textAlign: 'center',
		marginBottom: 20,
		lineHeight: 24
	},
	retryButton: {
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 8
	},
	retryText: {
		fontSize: 16,
		fontWeight: '600'
	}
})

class ErrorBoundaryClass extends Component<Props, State> {
	constructor(props: Props) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error('Navigation Error Boundary caught an error:', error, errorInfo)
	}

	handleRetry = () => {
		this.setState({ hasError: false, error: undefined })
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback
			}

			return <ErrorBoundaryContent error={this.state.error} onRetry={this.handleRetry} />
		}

		return this.props.children
	}
}

function ErrorBoundaryContent({ error, onRetry }: { error?: Error; onRetry: () => void }) {
	const { colors } = useTheme()

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Text style={[styles.errorText, { color: colors.text }]}>
				Something went wrong with the navigation.{'\n'}
				{error?.message && `Error: ${error.message}`}
			</Text>
			<TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={onRetry}>
				<Text style={[styles.retryText, { color: '#fff' }]}>Try Again</Text>
			</TouchableOpacity>
		</View>
	)
}

export function ErrorBoundary(props: Props) {
	return <ErrorBoundaryClass {...props} />
}
