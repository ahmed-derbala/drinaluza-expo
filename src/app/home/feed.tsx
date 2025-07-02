import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, StyleSheet, Button, Alert, RefreshControl } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getFeed } from '@/components/feed/feed.api'
import { FeedItem } from '@/components/feed/feed.interface'
import { useFocusEffect } from '@react-navigation/native'

export default function FeedScreen() {
	const [feedItems, setFeedItems] = useState<FeedItem[]>([])
	const [basket, setBasket] = useState<FeedItem[]>([])
	const [refreshing, setRefreshing] = useState(false)

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
		}
	}

	const refreshData = useCallback(async () => {
		setRefreshing(true)
		await Promise.all([loadBasket(), fetchFeed()])
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

	const renderItem = ({ item }: { item: FeedItem }) => (
		<View style={styles.card}>
			<Text style={styles.cardTitle}>{item.name}</Text>
			<Text style={styles.cardText}>Business: {item.business.name}</Text>
			<Text style={styles.cardText}>Shop: {item.shop?.name}</Text>
			<Text style={styles.cardText}>Created by: {item.createdByUser.username}</Text>
			<Text style={styles.cardText}>
				Unit: {item.price.unit.name} (Min: {item.price.unit.min})
			</Text>
			{item.card.type === 'product' && <Button title="Add to Basket" onPress={() => addToBasket(item)} color="#007AFF" />}
		</View>
	)

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

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#1a1a1a'
	},
	list: {
		padding: 10
	},
	card: {
		backgroundColor: '#333',
		padding: 15,
		marginBottom: 10,
		borderRadius: 5
	},
	cardTitle: {
		color: '#fff',
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 5
	},
	cardText: {
		color: '#fff',
		fontSize: 14,
		marginBottom: 5
	}
})
