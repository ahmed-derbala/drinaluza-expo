import React, { useState, useEffect } from 'react'
import { Image, ImageProps, View, StyleSheet, ActivityIndicator } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'

interface SmartImageProps extends ImageProps {
	fallbackIcon?: keyof typeof MaterialIcons.glyphMap
	containerStyle?: any
}

const SmartImage: React.FC<SmartImageProps> = ({ source, style, fallbackIcon = 'image-not-supported', containerStyle, ...props }) => {
	const { colors } = useTheme()
	const [error, setError] = useState(false)
	const [loading, setLoading] = useState(false)

	// Reset error state if source changes
	useEffect(() => {
		setError(false)
		setLoading(false)
	}, [source])

	const hasSource = !!source && (typeof source === 'number' || (typeof source === 'object' && !Array.isArray(source) && !!(source as any).uri))

	if (error || !hasSource) {
		const resolvedStyle = StyleSheet.flatten(style || {})
		const iconSize = typeof resolvedStyle.width === 'number' ? resolvedStyle.width / 3 : 32

		return (
			<View style={[styles.placeholder, { backgroundColor: colors.surface }, style, containerStyle]}>
				<MaterialIcons name={fallbackIcon} size={iconSize} color={colors.textTertiary} />
			</View>
		)
	}

	return (
		<View style={[styles.container, style, containerStyle]}>
			<Image
				{...props}
				source={source}
				style={[StyleSheet.absoluteFill, style]}
				onLoadStart={() => setLoading(true)}
				onLoad={() => setLoading(false)}
				onLoadEnd={() => setLoading(false)}
				onError={() => {
					console.warn('Image failed to load:', source)
					setLoading(false)
					setError(true)
				}}
			/>
			{loading && (
				<View style={styles.loader}>
					<ActivityIndicator size="small" color={colors.primary} />
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		position: 'relative',
		overflow: 'hidden'
	},
	placeholder: {
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 8
	},
	loader: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0,0,0,0.05)'
	}
})

export default SmartImage
