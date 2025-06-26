import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import { getFeed, FeedItem } from '@/components/feed/feed.api'

export default function FeedScreen() {
	const [feedItems, setFeedItems] = useState<FeedItem[]>([])

	useEffect(() => {
		const fetchFeed = async () => {
			try {
				const response = await getFeed()
				setFeedItems(response.data.data)
			} catch (error) {
				console.error('Failed to fetch feed:', error)
			}
		}
		fetchFeed()
	}, [])

	const renderItem = ({ item }: { item: FeedItem }) => (
		<View style={styles.card}>
			<Text style={styles.cardTitle}>{item.name}</Text>
			<Text style={styles.cardText}>Business: {item.business.name}</Text>
			<Text style={styles.cardText}>Shop: {item.shops[0]?.name}</Text>
			<Text style={styles.cardText}>Created by: {item.createdByUser.username}</Text>
			<Text style={styles.cardText}>
				Unit: {item.price.unit.name} (Min: {item.price.unit.min})
			</Text>
		</View>
	)

	return (
		<View style={styles.container}>
			<FlatList data={feedItems} renderItem={renderItem} keyExtractor={(item) => item._id} contentContainerStyle={styles.list} />
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
		fontSize: 14
	}
})
