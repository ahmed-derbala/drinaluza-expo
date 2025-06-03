import { Tabs } from 'expo-router'

export default function HomeLayout() {
	return (
		<Tabs screenOptions={{ headerShown: false }}>
			<Tabs.Screen name="feed" options={{ title: 'Feed' }} />
			<Tabs.Screen name="settings" options={{ title: 'Settings' }} />
		</Tabs>
	)
}
