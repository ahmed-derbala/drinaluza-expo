import React, { useState, useRef, useCallback } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'
import { searchFeed } from '../feed/feed.api'
import { FeedItem } from '../feed/feed.interface'
import { parseError, logError } from '../../utils/errorHandler'

interface SearchBarProps {
	onSearchResults: (results: FeedItem[]) => void
	onSearchClear: () => void
	onError?: (message: string, retry?: () => void) => void
}

const SEARCH_TYPES = [
	{ id: 'products', label: 'Products' },
	{ id: 'shops', label: 'Shops' },
	{ id: 'users', label: 'Users' }
]

export default function SearchBar({ onSearchResults, onSearchClear, onError }: SearchBarProps) {
	const { colors, isDark } = useTheme()
	const [searchText, setSearchText] = useState('')
	const [selectedTypes, setSelectedTypes] = useState<string[]>(['products'])
	const searchTimerRef = useRef<NodeJS.Timeout | null>(null)

	const performSearch = useCallback(
		async (text: string) => {
			try {
				const response = await searchFeed(text, 'en', selectedTypes)
				onSearchResults(response.data.data)
			} catch (err) {
				logError(err, 'SearchBar')
				const errorInfo = parseError(err)
				if (onError) {
					onError(`Search failed: ${errorInfo.message}`, errorInfo.canRetry ? () => performSearch(text) : undefined)
				}
			}
		},
		[onSearchResults, onSearchClear, onError, selectedTypes]
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
			<View style={[styles.container, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
				<Ionicons name="search-outline" size={20} color={colors.textSecondary} style={styles.icon} />
				<TextInput
					style={[styles.input, { color: colors.text }]}
					placeholder="Search..."
					placeholderTextColor={colors.textTertiary}
					value={searchText}
					onChangeText={handleTextChange}
					returnKeyType="search"
					autoCorrect={false}
					autoCapitalize="none"
					keyboardAppearance={isDark ? 'dark' : 'light'}
				/>
				{searchText.length > 0 && (
					<TouchableOpacity onPress={handleClear} style={styles.clearButton}>
						<Ionicons name="close-circle" size={20} color={colors.textSecondary} />
					</TouchableOpacity>
				)}
			</View>
			<View style={styles.filtersContainer}>
				{SEARCH_TYPES.map((type) => (
					<TouchableOpacity
						key={type.id}
						style={[styles.filterPill, selectedTypes.includes(type.id) && { backgroundColor: colors.primary, borderColor: colors.primary }, { borderColor: colors.border }]}
						onPress={() => toggleType(type.id)}
					>
						<Text style={[styles.filterText, selectedTypes.includes(type.id) ? { color: '#fff' } : { color: colors.textSecondary }]}>{type.label}</Text>
					</TouchableOpacity>
				))}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 12,
		marginBottom: 20,
		borderWidth: 1
	},
	icon: {
		marginRight: 8
	},
	input: {
		flex: 1,
		fontSize: 16,
		padding: 0
	},
	clearButton: {
		padding: 4
	},
	filtersContainer: {
		flexDirection: 'row',
		marginTop: 8,
		paddingHorizontal: 4
	},
	filterPill: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		borderWidth: 1,
		marginRight: 8
	},
	filterText: {
		fontSize: 12,
		fontWeight: '500'
	}
})
