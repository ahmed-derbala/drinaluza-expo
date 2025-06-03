import { View, Text, FlatList, StyleSheet } from 'react-native'
import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { useTheme } from '@/core/theme'
import { FeedItem, FeedResponse } from '@/components/feed/feed.service'

export default function FeedScreen() {
	const [feedData, setFeedData] = useState<FeedItem[]>([])
	const { themeStyles } = useTheme()

	useEffect(() => {
		const fetchFeed = async () => {
			try {
				const token = await AsyncStorage.getItem('authToken')
				const response = await axios.get<FeedResponse>('http://192.168.1.15:5001/api/feed', {
					headers: { Authorization: `Bearer ${token}` }
				})
				setFeedData(response.data.data.data)
			} catch (error) {
				console.error('Feed fetch error:', error)
				alert('Failed to load feed')
			}
		}
		fetchFeed()
	}, [])

	const renderItem = ({ item }: { item: FeedItem }) => (
		<View style={[styles.card, themeStyles.card]}>
			<Text style={[styles.cardTitle, themeStyles.text]}>{item.name}</Text>
			<Text style={themeStyles.text}>Business: {item.business.name}</Text>
			<Text style={themeStyles.text}>Shop: {item.shops[0]?.name || 'N/A'}</Text>
			<Text style={themeStyles.text}>
				Unit: {item.unit.name} (Min: {item.unit.min})
			</Text>
			<Text style={themeStyles.text}>Created By: {item.createdByUser.username}</Text>
			<Text style={themeStyles.text}>Created At: {new Date(item.createdAt).toLocaleDateString()}</Text>
		</View>
	)

	return (
		<View style={[styles.container, themeStyles.background]}>
			<FlatList data={feedData} renderItem={renderItem} keyExtractor={(item) => item._id} contentContainerStyle={styles.list} />
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 10
	},
	list: {
		paddingBottom: 20
	},
	card: {
		padding: 15,
		marginVertical: 10,
		borderRadius: 8,
		borderWidth: 1
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 5
	}
})
