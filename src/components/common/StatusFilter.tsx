import React from 'react'
import { View, StyleSheet, TouchableOpacity, ScrollView, Text } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'
import { Ionicons } from '@expo/vector-icons'

type Status = 'all' | 'pending' | 'completed' | 'cancelled' | 'processing'

interface StatusFilterProps {
	selectedStatus: Status
	onStatusChange: (status: Status) => void
}

const statusOptions: { value: Status; icon: keyof typeof Ionicons.glyphMap }[] = [
	{ value: 'all', icon: 'apps' },
	{ value: 'pending', icon: 'time-outline' },
	{ value: 'processing', icon: 'sync-outline' },
	{ value: 'completed', icon: 'checkmark-circle-outline' },
	{ value: 'cancelled', icon: 'close-circle-outline' }
]

export default function StatusFilter({ selectedStatus, onStatusChange }: StatusFilterProps) {
	const { colors } = useTheme()

	return (
		<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
			{statusOptions.map((status) => {
				const isSelected = selectedStatus === status.value
				return (
					<TouchableOpacity
						key={status.value}
						style={[
							styles.filterButton,
							{
								backgroundColor: isSelected ? colors.primary : colors.surface,
								borderColor: isSelected ? colors.primary : colors.border
							}
						]}
						onPress={() => onStatusChange(status.value)}
						activeOpacity={0.7}
					>
						<Ionicons name={status.icon} size={20} color={isSelected ? colors.textOnPrimary : colors.textSecondary} />
					</TouchableOpacity>
				)
			})}
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		paddingVertical: 12,
		paddingHorizontal: 16,
		gap: 8
	},
	filterButton: {
		width: 48,
		height: 48,
		borderRadius: 12,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center'
	}
})
