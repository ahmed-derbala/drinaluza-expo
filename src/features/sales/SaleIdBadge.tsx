import { Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'
import { Sale } from './sales.api'
export interface SaleIdBadgeProps {
	sale: Sale
	style?: StyleProp<ViewStyle>
}
export default function SaleIdBadge({ sale, style }: SaleIdBadgeProps) {
	const router = useRouter()
	const pathname = usePathname()
	const { colors } = useTheme()
	const displayId = sale._id.slice(-6)
	const handlePress = () => {
		const target = `/dashboard/${sale.business.slug}/sales/${sale._id}`
		if (pathname === target) return
		router.push(target as any)
	}
	return (
		<TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={[styles.badge, { backgroundColor: colors.primary + '15' }, style]}>
			<Ionicons name="pricetag-outline" size={12} color={colors.primary} />
			<Text style={[styles.text, { color: colors.primary }]} numberOfLines={1}>
				{displayId}
			</Text>
		</TouchableOpacity>
	)
}
const styles = StyleSheet.create({
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 10,
		gap: 4,
		alignSelf: 'flex-end'
	},
	text: {
		fontSize: 11,
		fontWeight: '600'
	}
})
