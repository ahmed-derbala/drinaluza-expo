import React, { useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '../../contexts/ThemeContext'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import ScreenHeader from '../common/ScreenHeader'

type ActionButtonProps = {
	label: string
	icon: React.ReactNode
	onPress: () => void
}

const ActionButton = ({ label, icon, onPress }: ActionButtonProps) => {
	const { colors } = useTheme()
	return (
		<TouchableOpacity onPress={onPress} style={[styles.actionCard, { borderColor: colors.border }]}>
			<View style={[styles.actionIcon, { backgroundColor: `${colors.primary}12` }]}>{icon}</View>
			<Text style={[styles.actionLabel, { color: colors.text }]}>{label}</Text>
		</TouchableOpacity>
	)
}

const BusinessDashboard = () => {
	const { colors } = useTheme()
	const router = useRouter()
	const { width } = useWindowDimensions()
	const isWide = width > 720
	const contentWidth = Math.min(width, 960)

	const actions = useMemo(
		() => [
			{
				label: 'Shops',
				icon: <MaterialIcons name="store" size={22} color={colors.primary} />,
				onPress: () => router.push('/home/business/my-shops' as any)
			},
			{
				label: 'Products',
				icon: <MaterialIcons name="inventory" size={22} color={colors.success} />,
				onPress: () => router.push('/home/business/my-products' as any)
			},
			{
				label: 'Sales',
				icon: <MaterialIcons name="receipt-long" size={22} color={colors.info} />,
				onPress: () => router.push('/home/business/sales' as any)
			}
		],
		[colors.info, colors.primary, colors.success, router]
	)

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScreenHeader
				title="Business"
				subtitle="Manage your business"
				showBack={false}
				rightActions={
					<TouchableOpacity onPress={() => router.push('/home/settings' as any)} accessibilityLabel="Notifications and settings">
						<Ionicons name="notifications-outline" size={22} color={colors.text} />
					</TouchableOpacity>
				}
			/>

			<ScrollView contentContainerStyle={[styles.scrollContainer, { width: contentWidth }]} showsVerticalScrollIndicator={false}>
				<View style={styles.section}>
					<Text style={[styles.sectionTitle, { color: colors.text }]}>Quick actions</Text>
					<View style={[styles.actionsGrid, isWide && styles.actionsGridWide]}>
						{actions.map((action) => (
							<ActionButton key={action.label} {...action} />
						))}
					</View>
				</View>
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	scrollContainer: {
		paddingHorizontal: 16,
		paddingBottom: 32,
		alignSelf: 'center'
	},
	section: {
		marginBottom: 20,
		marginTop: 20
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 16
	},
	actionsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12
	},
	actionsGridWide: {
		justifyContent: 'flex-start'
	},
	actionCard: {
		borderRadius: 12,
		padding: 14,
		minWidth: 150,
		flex: 1,
		borderWidth: 1,
		alignItems: 'flex-start'
	},
	actionIcon: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 8
	},
	actionLabel: {
		fontSize: 15,
		fontWeight: '600'
	}
})

export default BusinessDashboard
