import React, { useState, useRef, useCallback } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'
import { searchFeed } from '../feed/feed.api'
import { FeedItem } from '../feed/feed.interface'
import { parseError, logError } from '../../utils/errorHandler'
import { useUser } from '../../contexts/UserContext'

interface SearchBarProps {
	onSearchResults: (results: FeedItem[]) => void
	onSearchClear: () => void
	onError?: (message: string, retry?: () => void) => void
}

export default function SearchBar({ onSearchResults, onSearchClear, onError }: SearchBarProps) {
	const { colors } = useTheme()
	const { translate, appLang } = useUser()
	const [searchText, setSearchText] = useState('')

	const searchTypes = [
		{ id: 'products', label: translate('products', 'Products'), icon: 'fish-outline' },
		{ id: 'shops', label: translate('shops', 'Shops'), icon: 'storefront-outline' },
		{ id: 'users', label: translate('users', 'Users'), icon: 'person-outline' }
	]

	const [selectedTypes, setSelectedTypes] = useState<string[]>(['products'])
	const searchTimerRef = useRef<NodeJS.Timeout | null>(null)

	const performSearch = useCallback(
		async (text: string) => {
			try {
				const apiLang = (appLang.startsWith('tn') ? 'tn' : 'en') as 'en' | 'tn'
				const response = await searchFeed(text, apiLang, selectedTypes)
				onSearchResults(response.data.docs)
			} catch (err) {
				logError(err, 'SearchBar')
				const errorInfo = parseError(err)
				if (onError) {
					onError(`${translate('search_failed', 'Search failed')}: ${errorInfo.message}`, errorInfo.canRetry ? () => performSearch(text) : undefined)
				}
			}
		},
		[onSearchResults, onSearchClear, onError, selectedTypes, appLang, translate]
	)

	const toggleType = useCallback((typeId: string) => {
		setSelectedTypes((prev) => {
			const newTypes = prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]

			// Ensure at least one type is selected
			if (newTypes.length === 0) return ['products']

			return newTypes
		})
	}, [])

	// Trigger search when filters change
	React.useEffect(() => {
		// Search if text exists OR if filters are not just default 'products'
		if (searchText.trim() || (selectedTypes.length > 0 && (selectedTypes.length !== 1 || selectedTypes[0] !== 'products'))) {
			performSearch(searchText)
		}
	}, [selectedTypes, performSearch])

	const handleTextChange = useCallback(
		(text: string) => {
			setSearchText(text)

			// Clear previous timer
			if (searchTimerRef.current) {
				clearTimeout(searchTimerRef.current)
			}

			// If empty, clear results immediately
			if (!text.trim()) {
				onSearchClear()
				return
			}

			// Debounce search
			searchTimerRef.current = setTimeout(() => {
				performSearch(text)
			}, 500) as unknown as NodeJS.Timeout
		},
		[performSearch, onSearchClear]
	)

	const handleClear = useCallback(() => {
		setSearchText('')
		if (searchTimerRef.current) {
			clearTimeout(searchTimerRef.current)
		}
		onSearchClear()
	}, [onSearchClear])

	return (
		<View>
			<View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
				<Ionicons name="search" size={20} color={colors.textSecondary} style={styles.icon} />
				<TextInput
					style={[styles.input, { color: colors.text }]}
					placeholder={translate('search_placeholder', 'Search products, shops...')}
					placeholderTextColor={colors.textTertiary}
					value={searchText}
					onChangeText={handleTextChange}
					returnKeyType="search"
					autoCorrect={false}
					autoCapitalize="none"
					keyboardAppearance="dark"
				/>
				{searchText.length > 0 && (
					<TouchableOpacity onPress={handleClear} style={[styles.clearButton, { backgroundColor: colors.surfaceVariant }]}>
						<Ionicons name="close" size={18} color={colors.text} />
					</TouchableOpacity>
				)}
			</View>
			<View style={styles.filtersContainer}>
				{searchTypes.map((type) => {
					const isSelected = selectedTypes.includes(type.id)
					return (
						<TouchableOpacity
							key={type.id}
							style={[styles.filterPill, { backgroundColor: isSelected ? colors.primary : colors.surface, borderColor: isSelected ? colors.primary : colors.border }]}
							onPress={() => toggleType(type.id)}
						>
							<Ionicons name={type.icon as any} size={16} color={isSelected ? colors.textOnPrimary : colors.textSecondary} />
						</TouchableOpacity>
					)
				})}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderWidth: 1
	},
	icon: {
		marginRight: 10
	},
	input: {
		flex: 1,
		fontSize: 16,
		padding: 0
	},
	clearButton: {
		width: 28,
		height: 28,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center'
	},
	filtersContainer: {
		flexDirection: 'row',
		marginTop: 12,
		gap: 8
	},
	filterPill: {
		width: 44,
		height: 44,
		borderRadius: 12,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center'
	}
})
