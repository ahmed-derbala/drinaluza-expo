import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, StyleSheet, Button, Alert, RefreshControl } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getFeed } from '@/components/feed/feed.api'
import { FeedItem } from '@/components/feed/feed.interface'
import { useFocusEffect } from '@react-navigation/native'
import ProductCard from '@/components/products/products.card' // adjust path as needed
import { ProductType } from '@/components/products/products.type'
import { useTheme } from '@/contexts/ThemeContext'
import { createThemedStyles, commonThemedStyles } from '@/core/theme/createThemedStyles'

export default function FeedScreen() {
	const { colors } = useTheme()
	const [feedItems, setFeedItems] = useState<FeedItem[]>([])
	const [basket, setBasket] = useState<FeedItem[]>([])
	const [refreshing, setRefreshing] = useState(false)

	const styles = createThemedStyles((colors) => ({
		...commonThemedStyles(colors),
		container: {
			flex: 1,
			backgroundColor: colors.background
		},
		title: {
			fontSize: 24,
			fontWeight: 'bold',
			color: colors.text,
			marginBottom: 16,
			paddingHorizontal: 16
		},
		emptyText: {
			fontSize: 16,
			color: colors.textSecondary,
			textAlign: 'center',
			marginTop: 50
		},
		list: {
			padding: 10
		}
	}))(colors)

	const loadBasket = async () => {
		try {
			const storedBasket = await AsyncStorage.getItem('basket')
			if (storedBasket) {
				setBasket(JSON.parse(storedBasket))
			}
		} catch (error) {
			console.error('Failed to load basket:', error)
		}
	}

	const fetchFeed = async () => {
		try {
			const response = await getFeed()
			setFeedItems(response.data.data)
		} catch (error) {
			console.error('Failed to fetch feed:', error)
			// Show user-friendly error message
			Alert.alert('Network Error', 'Unable to connect to the server. Please check your server settings and ensure the server is running.', [
				{
					text: 'OK',
					onPress: () => console.log('User acknowledged network error')
				}
			])
		}
	}

	const refreshData = useCallback(async () => {
		setRefreshing(true)
		await Promise.all([loadBasket(), fetchFeed()])
		const keys = await AsyncStorage.getAllKeys()
		console.log(keys)
		setRefreshing(false)
	}, [])

	// Refresh data when the Feed tab is focused
	useFocusEffect(
		useCallback(() => {
			refreshData()
		}, [refreshData])
	)

	// Initial load on mount (optional, as useFocusEffect will handle it)
	useEffect(() => {
		refreshData()
	}, [refreshData])

	const addToBasket = async (item: FeedItem) => {
		try {
			const newBasket = [...basket, item]
			setBasket(newBasket)
			await AsyncStorage.setItem('basket', JSON.stringify(newBasket))
			Alert.alert('Success', `${item.name} added to basket`)
		} catch (error) {
			console.error('Failed to add to basket:', error)
			Alert.alert('Error', 'Failed to add item to basket')
		}
	}

	const renderItem = ({ item }: { item: ProductType }) => <ProductCard item={item} addToBasket={addToBasket} />

	return (
		<View style={styles.container}>
			<FlatList
				data={feedItems}
				renderItem={renderItem}
				keyExtractor={(item) => item._id}
				contentContainerStyle={styles.list}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshData} />}
			/>
		</View>
	)
}
