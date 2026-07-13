import React, { useCallback } from 'react'
import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform, BackHandler, Pressable, useWindowDimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, createShadow } from '@/core/theme'
import type { SmartModalProps, ModalVariant } from './types'

export default function SmartModal({
	visible,
	onClose,
	variant = 'centered',
	animationType = 'fade',
	title,
	subtitle,
	children,
	headerIcon,
	headerActions,
	footer,
	showCloseButton = true,
	closeOnOverlayPress = true,
	closeOnBackPress = true,
	containerStyle,
	contentStyle,
	maxWidth = 400,
	testID
}: SmartModalProps) {
	const { colors } = useTheme()
	const { width } = useWindowDimensions()
	const isWideScreen = width >= 768
	const responsiveMaxWidth = maxWidth || Math.min(width * 0.9, 480)

	// Handle Android back button
	React.useEffect(() => {
		if (Platform.OS === 'android' && closeOnBackPress && visible) {
			const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
				onClose()
				return true
			})
			return () => backHandler.remove()
		}
	}, [visible, closeOnBackPress, onClose])

	const handleOverlayPress = useCallback(() => {
		if (closeOnOverlayPress) {
			onClose()
		}
	}, [closeOnOverlayPress, onClose])

	const renderHeader = () => {
		if (!title && !headerActions && !showCloseButton && !headerIcon) return null

		return (
			<View style={[styles.header, { borderBottomColor: colors.border + '20' }]}>
				<View style={styles.headerLeft}>
					{headerIcon && <View style={styles.headerIconWrap}>{headerIcon}</View>}
					<View style={styles.headerTextColumn}>
						{title && (
							<Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
								{title}
							</Text>
						)}
						{subtitle && (
							<Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
								{subtitle}
							</Text>
						)}
					</View>
				</View>
				<View style={styles.headerRight}>
					{headerActions}
					{showCloseButton && (
						<TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surfaceVariant }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} testID={`${testID}-close`}>
							<Ionicons name="close" size={20} color={colors.text} />
						</TouchableOpacity>
					)}
				</View>
			</View>
		)
	}

	const renderContent = () => {
		return (
			<View style={[styles.content, contentStyle]} testID={`${testID}-content`}>
				{children}
			</View>
		)
	}

	const renderFooter = () => {
		if (!footer) return null
		return <View style={[styles.footer, { borderTopColor: colors.border + '20' }]}>{footer}</View>
	}

	const getModalStyle = () => {
		const baseStyle = { backgroundColor: colors.card }

		switch (variant) {
			case 'centered':
				return {
					...baseStyle,
					width: isWideScreen ? '60%' : '90%',
					maxWidth: responsiveMaxWidth,
					alignSelf: 'center',
					borderRadius: 20,
					padding: isWideScreen ? 24 : 20,
					...createShadow({ offsetY: 10, opacity: 0.25, radius: 20, elevation: 10 })
				}
			case 'bottomSheet':
				return {
					...baseStyle,
					width: '100%',
					alignSelf: 'flex-end',
					borderTopLeftRadius: 20,
					borderTopRightRadius: 20,
					paddingBottom: 20,
					paddingTop: 20,
					paddingHorizontal: 20,
					maxHeight: '85%',
					...createShadow({ offsetY: -4, opacity: 0.15, radius: 16, elevation: 8 })
				}
			case 'fullscreen':
				return {
					...baseStyle,
					width: '100%',
					height: '100%'
				}
			default:
				return baseStyle
		}
	}

	const getOverlayStyle = () => {
		return {
			backgroundColor: colors.modalOverlay || 'rgba(0, 0, 0, 0.5)'
		}
	}

	const getContainerStyle = () => {
		switch (variant) {
			case 'centered':
				return {
					justifyContent: 'center' as const,
					alignItems: 'center' as const
				}
			case 'bottomSheet':
				return {
					justifyContent: 'flex-end' as const,
					alignItems: 'stretch' as const
				}
			case 'fullscreen':
				return {
					justifyContent: 'flex-start' as const,
					alignItems: 'stretch' as const
				}
			default:
				return {}
		}
	}

	const getAnimationType = () => {
		switch (variant) {
			case 'bottomSheet':
				return 'slide'
			case 'fullscreen':
				return 'slide'
			default:
				return animationType
		}
	}

	return (
		<Modal visible={visible} animationType={getAnimationType()} transparent={variant !== 'fullscreen'} onRequestClose={onClose} testID={testID}>
			{variant === 'fullscreen' ? (
				<View style={[styles.fullscreenContainer, { backgroundColor: colors.background }]}>
					{renderHeader()}
					{renderContent()}
					{renderFooter()}
				</View>
			) : (
				<Pressable style={[styles.overlay, getOverlayStyle(), getContainerStyle(), containerStyle]} onPress={handleOverlayPress}>
					<View style={[styles.modalCard, getModalStyle()]} onStartShouldSetResponder={() => true}>
						{renderHeader()}
						{renderContent()}
						{renderFooter()}
					</View>
				</Pressable>
			)}
		</Modal>
	)
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1
	},
	fullscreenContainer: {
		flex: 1
	},
	modalCard: {
		width: '100%'
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingBottom: 16,
		borderBottomWidth: 1,
		marginBottom: 16
	},
	headerLeft: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		marginRight: 8,
		gap: 12
	},
	headerIconWrap: {
		justifyContent: 'center',
		alignItems: 'center'
	},
	headerTextColumn: {
		flex: 1,
		justifyContent: 'center'
	},
	headerRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8
	},
	title: {
		fontSize: 20,
		fontWeight: '700'
	},
	subtitle: {
		fontSize: 14,
		fontWeight: '500',
		marginTop: 2
	},
	closeButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center'
	},
	content: {
		flex: 1
	},
	footer: {
		paddingTop: 16,
		borderTopWidth: 1,
		marginTop: 16
	}
})
