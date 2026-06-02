import React from 'react'
import { StyleSheet, View, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/core/theme'
import { SmartKebabMenu } from '@/core/smart-kebab-menu'
import { SmartScreenHeaderProps } from './types'
import BackButton from './components/BackButton'
import Title from './components/Title'

const SmartScreenHeader: React.FC<SmartScreenHeaderProps> = ({
	title,
	subtitle,
	showBackButton = false,
	onBackPress,
	headerLeft,
	headerRight,
	loading = false,
	safeArea = true,
	borderBottom = true,
	backgroundColor,
	style,
	children
}) => {
	const insets = useSafeAreaInsets()
	const { colors } = useTheme()

	const resolvedBackground = backgroundColor || colors.background || '#000000'
	const resolvedBorderColor = colors.borderLight || colors.border || '#1E293B'

	return (
		<View
			style={[
				styles.outerContainer,
				{
					backgroundColor: resolvedBackground,
					paddingTop: safeArea ? insets.top : 0,
					borderBottomWidth: borderBottom ? StyleSheet.hairlineWidth : 0,
					borderBottomColor: resolvedBorderColor
				},
				style
			]}
		>
			{children ? (
				children
			) : (
				<View style={styles.innerContainer}>
					{/* Absolutely Centered Title block to prevent layout shifts */}
					<View style={styles.titleWrapper} pointerEvents="box-none">
						<Title title={title} subtitle={subtitle} loading={loading} />
					</View>

					{/* Left Section */}
					<View style={styles.leftSection}>
						{showBackButton && <BackButton onPress={onBackPress} />}
						{headerLeft}
					</View>

					{/* Right Section */}
					<View style={styles.rightSection}>
						{headerRight}
						<SmartKebabMenu />
					</View>
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	outerContainer: {
		width: '100%',
		zIndex: 100,
		...Platform.select({
			ios: {
				shadowColor: '#000000',
				shadowOffset: { width: 0, height: 1 },
				shadowOpacity: 0.15,
				shadowRadius: 2
			},
			android: {
				elevation: 2
			},
			web: {
				position: 'sticky',
				top: 0
			}
		})
	},
	innerContainer: {
		height: 56,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		position: 'relative'
	},
	titleWrapper: {
		position: 'absolute',
		left: 76,
		right: 76,
		top: 0,
		bottom: 0,
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 1
	},
	leftSection: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		zIndex: 2
	},
	rightSection: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		zIndex: 2
	}
})

export default React.memo(SmartScreenHeader)

export const getSmartHeaderOptions = () => ({
	header: (props: any) => {
		const title = props.options.headerTitle !== undefined ? props.options.headerTitle : props.options.title !== undefined ? props.options.title : props.route.name

		const showBackButton = props.options.headerLeft === undefined ? props.navigation.canGoBack() : false

		return (
			<SmartScreenHeader
				title={typeof title === 'string' ? title : undefined}
				showBackButton={showBackButton}
				onBackPress={props.navigation.goBack}
				headerRight={props.options.headerRight ? props.options.headerRight({ tintColor: '#F8FAFC' }) : undefined}
				headerLeft={props.options.headerLeft ? props.options.headerLeft({ tintColor: '#F8FAFC' }) : undefined}
			/>
		)
	}
})
