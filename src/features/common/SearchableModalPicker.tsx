import React, { useState, useCallback, useMemo } from 'react'
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { FlashList as ShopifyFlashList } from '@shopify/flash-list'
const FlashList = ShopifyFlashList as any
import { Ionicons } from '@expo/vector-icons'
import { useTheme, colors as themeColors } from '@/core/theme'
import { translate } from '@/core/translation'
import Spinner from '@/features/common/Spinner'

export interface SearchableModalPickerProps<T> {
	/**
	 * Toggle picker visibility.
	 */
	visible: boolean
	/**
	 * Header title text.
	 */
	title: string
	/**
	 * Dataset to list.
	 */
	data: T[]
	/**
	 * Callback triggered when an item is selected.
	 */
	onSelect: (item: T) => void
	/**
	 * Callback triggered when close is tapped.
	 */
	onClose: () => void
	/**
	 * Selected item key/ID.
	 */
	selectedId?: string
	/**
	 * Optional query matching placeholder.
	 */
	searchPlaceholder?: string
	/**
	 * Extract string representing the searchable title/value from cell item.
	 */
	searchKeyExtractor?: (item: T) => string
	/**
	 * Unique key identifier extractor.
	 */
	keyExtractor: (item: T) => string
	/**
	 * Presentational list cell renderer taking item and its selection state.
	 */
	renderItem: (item: T, isSelected: boolean) => React.ReactNode
	/**
	 * Optional loading indicator toggle.
	 */
	loading?: boolean
}

function SearchableModalPicker<T>({
	visible,
	title,
	data,
	onSelect,
	onClose,
	selectedId,
	searchPlaceholder = translate('search_products', 'Search products...'),
	searchKeyExtractor,
	keyExtractor,
	renderItem,
	loading = false
}: SearchableModalPickerProps<T>) {
	const { colors } = useTheme()
	const [searchQuery, setSearchQuery] = useState('')

	// Filter data based on search searchKeyExtractor
	const filteredData = useMemo(() => {
		if (!searchQuery.trim() || !searchKeyExtractor) return data
		return data.filter((item) => searchKeyExtractor(item).toLowerCase().includes(searchQuery.toLowerCase()))
	}, [data, searchQuery, searchKeyExtractor])

	const handleClose = () => {
		setSearchQuery('')
		onClose()
	}

	const handleSelect = useCallback(
		(item: T) => {
			onSelect(item)
			setSearchQuery('')
		},
		[onSelect]
	)

	const renderListItem = useCallback(
		({ item }: { item: T }) => {
			const id = keyExtractor(item)
			const isSelected = selectedId === id
			return <TouchableOpacity onPress={() => handleSelect(item)}>{renderItem(item, isSelected)}</TouchableOpacity>
		},
		[keyExtractor, selectedId, handleSelect, renderItem]
	)

	return (
		<Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
			<View style={styles.modalOverlay}>
				<View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
					{/* Modal Header */}
					<View style={styles.modalHeader}>
						<Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
						<TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
							<Ionicons name="close" size={24} color={colors.error} />
						</TouchableOpacity>
					</View>

					{/* Optional Search Bar */}
					{searchKeyExtractor && (
						<View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
							<Ionicons name="search" size={20} color={colors.textSecondary} />
							<TextInput
								style={[styles.searchInput, { color: colors.text }]}
								value={searchQuery}
								onChangeText={setSearchQuery}
								placeholder={searchPlaceholder}
								placeholderTextColor={colors.textTertiary}
								autoCapitalize="none"
								autoCorrect={false}
							/>
							{searchQuery.length > 0 && (
								<TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
									<Ionicons name="close-circle" size={18} color={colors.textTertiary} />
								</TouchableOpacity>
							)}
						</View>
					)}

					{/* Data List */}
					{loading ? (
						<Spinner />
					) : (
						<FlashList
							style={{ flex: 1 }}
							data={filteredData}
							keyExtractor={keyExtractor}
							keyboardShouldPersistTaps="handled"
							renderItem={renderListItem}
							estimatedItemSize={64}
							ListEmptyComponent={<Text style={[styles.emptyState, { color: colors.textSecondary }]}>{translate('no_results_found', 'No results found')}</Text>}
							contentContainerStyle={styles.listContent}
						/>
					)}
				</View>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	modalOverlay: {
		flex: 1,
		backgroundColor: themeColors.background50,
		justifyContent: 'flex-end'
	},
	modalContent: {
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		maxHeight: '80%',
		minHeight: '40%',
		paddingBottom: 24
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: themeColors.background5
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '700'
	},
	closeBtn: {
		padding: 4
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 12,
		paddingHorizontal: 12,
		height: 44,
		margin: 16,
		borderWidth: 1
	},
	searchInput: {
		flex: 1,
		fontSize: 15,
		paddingHorizontal: 8,
		height: '100%',
		paddingVertical: 0
	},
	listContent: {
		paddingHorizontal: 20
	},
	emptyState: {
		textAlign: 'center',
		marginTop: 40,
		fontSize: 14,
		fontStyle: 'italic'
	}
})

export default SearchableModalPicker
