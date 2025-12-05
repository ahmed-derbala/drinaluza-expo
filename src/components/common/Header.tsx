import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native'
import { useNavigation } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'

interface HeaderProps {
	title: string
	showBackButton?: boolean
	rightComponent?: React.ReactNode
}

const Header: React.FC<HeaderProps> = ({ title, showBackButton = true, rightComponent }) => {
	const navigation = useNavigation()
	const { colors, isDark } = useTheme()

	const handleBack = () => {
		if (navigation.canGoBack()) {
			navigation.goBack()
		}
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<View style={styles.content}>
				<View style={styles.leftContainer}>
					{showBackButton && (
						<TouchableOpacity onPress={handleBack} style={styles.backButton}>
							<Ionicons name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} size={24} color={colors.primary} />
						</TouchableOpacity>
					)}
					<Text style={[styles.title, { color: colors.text }]}>{title}</Text>
				</View>
				{rightComponent && <View style={styles.rightContainer}>{rightComponent}</View>}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		paddingTop: Platform.OS === 'ios' ? 50 : 10,
		paddingBottom: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0'
	},
	content: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16
	},
	leftContainer: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	backButton: {
		marginRight: 12,
		padding: 4
	},
	title: {
		fontSize: 18,
		fontWeight: '600'
	},
	rightContainer: {
		flexDirection: 'row',
		alignItems: 'center'
	}
})

export default Header
