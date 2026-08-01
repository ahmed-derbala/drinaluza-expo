import React, { useCallback, useEffect, useMemo } from 'react'
import { BackHandler, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { useTheme, createShadow, AppThemeColors } from '@/core/theme'
import { STATUS_ICONS, getStatusColor } from './utils'
import { IconButton, type IconVariant } from '@/features/common/buttons/IconButton'
import type { SmartModalProps, SmartModalButton } from './types'

function resolveIconVariant(color: string, colors: AppThemeColors, variant: SmartModalButton['variant']): IconVariant {
	if (color === colors.error) return 'danger'
	if (variant !== 'filled') return 'secondary'
	if (color === colors.success) return 'success'
	if (color === colors.warning) return 'warning'
	if (color === colors.info) return 'info'
	return 'primary'
}

const ModalBackdrop = Platform.OS === 'web' ? (View as any) : View

const ICON_SIZE = 24
const DEFAULT_MAX_WIDTH = 420
const BOTTOM_SHEET_MAX_HEIGHT_RATIO = 0.88

export default function SmartModal({
	visible,
	onClose,
	variant = 'centered',
	status = 'default',
	icon,
	iconColor,
	iconBackgroundColor,
	title,
	subtitle,
	message,
	children,
	buttons,
	headerActions,
	footer,
	closeOnOverlayPress = true,
	closeOnBackPress = true,
	containerStyle,
	contentStyle,
	modalStyle,
	maxWidth = DEFAULT_MAX_WIDTH,
	scrollable = true,
	scrollDirection = 'vertical',
	hideDragHandle = false,
	accessible = true,
	accessibilityLabel,
	accessibilityRole,
	testID
}: SmartModalProps) {
	const { colors } = useTheme()
	const { width, height } = useWindowDimensions()
	const isWideScreen = width >= 600

	useEffect(() => {
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

	const statusColor = useMemo(() => getStatusColor(status, colors), [status, colors])

	const renderIcon = () => {
		if (React.isValidElement(icon)) {
			return <View style={styles.iconWrap}>{icon}</View>
		}

		const hasStatus = status !== 'default'
		const hasIcon = typeof icon === 'string'

		if (!hasIcon && !hasStatus) return null

		const iconName = hasIcon ? (icon as any) : STATUS_ICONS[status]
		const color = iconColor || statusColor
		const backgroundColor = iconBackgroundColor || `${color}15`

		return (
			<View style={[styles.iconContainer, { backgroundColor }]}>
				<Ionicons name={iconName} size={ICON_SIZE} color={color} />
			</View>
		)
	}

	const renderHeader = () => {
		const hasHeader = title || subtitle || headerActions || icon || status !== 'default'
		if (!hasHeader) return null

		return (
			<View style={[styles.header, { borderBottomColor: colors.border + '20' }]}>
				<View style={styles.headerLeft}>
					{renderIcon()}
					<View style={styles.headerTextColumn}>
						{title && (
							<Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
								{title}
							</Text>
						)}
						{subtitle && (
							<Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={3}>
								{subtitle}
							</Text>
						)}
					</View>
				</View>
				<View style={styles.headerRight}>{headerActions}</View>
			</View>
		)
	}

	const renderMessage = () => {
		if (!message) return null
		return (
			<Text style={[styles.message, { color: colors.textSecondary }]} accessibilityRole="text">
				{message}
			</Text>
		)
	}

	const renderScrollContent = () => {
		const body = (
			<>
				{renderMessage()}
				{children}
			</>
		)

		if (!scrollable) {
			return <View style={[styles.content, contentStyle]}>{body}</View>
		}

		if (scrollDirection === 'horizontal') {
			return (
				<ScrollView horizontal showsHorizontalScrollIndicator style={[styles.content, contentStyle]} contentContainerStyle={styles.scrollContent} removeClippedSubviews testID={`${testID}-content`}>
					{body}
				</ScrollView>
			)
		}

		if (scrollDirection === 'both') {
			return (
				<ScrollView
					style={[styles.content, contentStyle]}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator
					nestedScrollEnabled
					removeClippedSubviews
					testID={`${testID}-content`}
				>
					<ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.horizontalScrollContainer} nestedScrollEnabled removeClippedSubviews>
						{body}
					</ScrollView>
				</ScrollView>
			)
		}

		return (
			<ScrollView style={[styles.content, contentStyle]} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator removeClippedSubviews testID={`${testID}-content`}>
				{body}
			</ScrollView>
		)
	}

	const renderFooter = () => {
		if (footer) {
			return <View style={[styles.footer, { borderTopColor: colors.border + '20' }]}>{footer}</View>
		}

		if (!buttons || buttons.length === 0) return null

		return (
			<View style={[styles.footer, { borderTopColor: colors.border + '20' }]}>
				<View style={[styles.buttonRow, isWideScreen && styles.buttonRowWide]}>
					{buttons.map((button, index) => {
						const accentColor = button.color || statusColor
						return (
							<IconButton
								key={`smart-modal-button-${index}`}
								icon={button.icon || (button.variant && button.variant !== 'filled' ? 'close-outline' : 'checkmark')}
								label={button.accessibilityLabel || button.text || 'Button'}
								onPress={button.onPress}
								disabled={button.disabled}
								loading={button.loading}
								variant={resolveIconVariant(accentColor, colors, button.variant)}
								colors={colors}
								style={button.style}
							/>
						)
					})}
				</View>
			</View>
		)
	}

	const renderDragHandle = () => {
		if (variant !== 'bottomSheet' || hideDragHandle) return null
		return (
			<View style={styles.dragHandleContainer}>
				<View style={[styles.dragHandle, { backgroundColor: colors.textTertiary }]} />
			</View>
		)
	}

	const getModalStyle = (): any => {
		const baseStyle = { backgroundColor: colors.card, borderWidth: 1, borderColor: '#FFFFFF' }

		switch (variant) {
			case 'centered':
				return {
					...baseStyle,
					width: isWideScreen ? '50%' : '92%',
					maxWidth: Math.min(maxWidth, width - 32),
					alignSelf: 'center',
					borderRadius: 24,
					padding: isWideScreen ? 16 : 12,
					maxHeight: height * 0.88,
					...createShadow({ offsetY: 16, opacity: 0.18, radius: 32, elevation: 12 })
				}
			case 'bottomSheet':
				return {
					...baseStyle,
					width: '100%',
					alignSelf: 'flex-end',
					borderTopLeftRadius: 24,
					borderTopRightRadius: 24,
					paddingTop: 4,
					paddingBottom: isWideScreen ? 16 : 12,
					paddingHorizontal: isWideScreen ? 16 : 12,
					maxHeight: height * BOTTOM_SHEET_MAX_HEIGHT_RATIO,
					...createShadow({ offsetY: -6, opacity: 0.18, radius: 20, elevation: 10 })
				}
			case 'fullscreen':
				return {
					...baseStyle,
					width: '100%',
					height: '100%',
					paddingTop: isWideScreen ? 14 : 10,
					paddingBottom: isWideScreen ? 16 : 12,
					paddingHorizontal: isWideScreen ? 16 : 12
				}
			default:
				return baseStyle
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

	const renderModalBody = () => {
		return (
			<View
				style={[styles.modalCard, getModalStyle(), modalStyle]}
				accessible={accessible}
				accessibilityLabel={accessibilityLabel || title}
				accessibilityRole={accessibilityRole || (status === 'error' ? 'alert' : undefined)}
				accessibilityViewIsModal
				importantForAccessibility="yes"
				testID={`${testID}-card`}
			>
				{renderDragHandle()}
				{renderHeader()}
				{renderScrollContent()}
				{renderFooter()}
			</View>
		)
	}

	if (!visible) {
		return null
	}

	if (variant === 'fullscreen') {
		return (
			<Modal visible={visible} animationType="none" transparent={false} onRequestClose={onClose} testID={testID}>
				<ModalBackdrop style={[styles.fullscreenContainer, { backgroundColor: colors.background }]} dataSet={{ smartModal: 'true' }}>
					<KeyboardAvoidingView style={styles.fullscreenContainer} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}>
						{renderModalBody()}
					</KeyboardAvoidingView>
				</ModalBackdrop>
			</Modal>
		)
	}

	return (
		<Modal visible={visible} animationType="none" transparent onRequestClose={onClose} testID={testID}>
			<ModalBackdrop style={[styles.overlay, { backgroundColor: colors.modalOverlay }, getContainerStyle(), containerStyle]} dataSet={{ smartModal: 'true' }}>
				<Pressable style={styles.pressArea} onPress={handleOverlayPress} accessible={false} />
				<KeyboardAvoidingView
					style={[styles.keyboardAvoiding, variant === 'centered' && styles.keyboardAvoidingPadded, getContainerStyle()]}
					behavior="padding"
					keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
				>
					{renderModalBody()}
				</KeyboardAvoidingView>
			</ModalBackdrop>
		</Modal>
	)
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1
	},
	pressArea: {
		position: 'absolute',
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
		zIndex: 0
	},
	fullscreenContainer: {
		flex: 1
	},
	keyboardAvoiding: {
		flex: 1,
		width: '100%',
		zIndex: 1
	},
	keyboardAvoidingPadded: {
		padding: 8
	},
	modalCard: {
		width: '100%',
		flexShrink: 1,
		zIndex: 1
	},
	dragHandleContainer: {
		alignItems: 'center',
		paddingVertical: 4
	},
	dragHandle: {
		width: 40,
		height: 5,
		borderRadius: 3
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		paddingBottom: 4,
		borderBottomWidth: StyleSheet.hairlineWidth,
		marginBottom: 4,
		gap: 8
	},
	headerLeft: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 10
	},
	headerTextColumn: {
		flex: 1,
		justifyContent: 'center',
		paddingTop: 2
	},
	headerRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8
	},
	iconWrap: {
		justifyContent: 'center',
		alignItems: 'center'
	},
	iconContainer: {
		width: 40,
		height: 40,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center'
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		lineHeight: 24
	},
	subtitle: {
		fontSize: 14,
		fontWeight: '500',
		marginTop: 2,
		lineHeight: 20
	},
	content: {
		flexShrink: 1,
		minWidth: '100%'
	},
	scrollContent: {
		flexGrow: 1,
		paddingBottom: 4
	},
	horizontalScrollContainer: {
		paddingBottom: 4
	},
	message: {
		fontSize: 16,
		fontWeight: '400',
		lineHeight: 22,
		textAlign: 'left',
		marginBottom: 4
	},
	footer: {
		paddingTop: 4,
		borderTopWidth: StyleSheet.hairlineWidth,
		marginTop: 'auto'
	},
	buttonRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 10,
		width: '100%'
	},
	buttonRowWide: {
		justifyContent: 'flex-end'
	}
})
