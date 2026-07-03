import React, { useEffect } from 'react'
import { Tabs, usePathname } from 'expo-router'
import { View, Platform, StyleSheet, TouchableOpacity, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const TabsComponent = Tabs as any
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLayout, useUser } from '@/core/contexts'
import { useNotification } from '@/features/notifications/NotificationContext'
import { useTheme } from '@/core/theme'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { useBackButton } from '@/core/hooks/useBackButton'
import { SmartHeader } from '@/core/smart-header'

export default function HomeLayout() {
	const { colors } = useTheme()
	const { isTabBarVisible, setTabBarVisible } = useLayout()
	const { translate, user } = useUser()
	const pathname = usePathname()
	useBackButton()
	// Derive auth state from UserContext — single source of truth, no extra token read
	const isAuthenticated = !!user
	const { notificationCount } = useNotification()
	const isDashboardVisible = isAuthenticated && user?.role === 'business_owner'
	const isNotificationsVisible = isAuthenticated
	const activeTabsCount = 2 + (isDashboardVisible ? 1 : 0) + (isNotificationsVisible ? 1 : 0)
	const barWidth = activeTabsCount * 48
	const insets = useSafeAreaInsets()

	useEffect(() => {
		setTabBarVisible(true)
	}, [pathname, setTabBarVisible])

	const renderTabBarIcon = (focusedIcon: string, unfocusedIcon: string, iconType: 'material' | 'ionicons', color: any, focused: boolean) => {
		const iconColor = focused ? colors.primary : colors.textTertiary
		return iconType === 'material' ? (
			<MaterialIcons name={(focused ? focusedIcon : unfocusedIcon) as any} size={20} color={iconColor} />
		) : (
			<Ionicons name={(focused ? focusedIcon : unfocusedIcon) as any} size={20} color={iconColor} />
		)
	}

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
			<TabsComponent
				sceneContainerStyle={{
					backgroundColor: colors.background
				}}
				tabBar={(props: any) => {
					const { state, descriptors, navigation } = props
					return (
						<View
							style={{
								position: 'absolute',
								bottom: Platform.select({
									ios: insets.bottom > 0 ? insets.bottom + 6 : 10,
									android: 10,
									web: 14
								}),
								left: 0,
								right: 0,
								alignItems: 'center',
								backgroundColor: 'transparent',
								transform: [{ translateY: isTabBarVisible ? 0 : 120 }],
								opacity: isTabBarVisible ? 1 : 0
							}}
						>
							<View
								style={{
									width: barWidth,
									height: 44,
									flexDirection: 'row',
									backgroundColor: 'rgba(15, 23, 42, 0.6)',
									borderRadius: 22,
									borderWidth: 0,
									...Platform.select({
										ios: {
											shadowColor: 'rgba(0, 0, 0, 0.5)',
											shadowOffset: { width: 0, height: 4 },
											shadowOpacity: 1,
											shadowRadius: 16
										},
										android: {
											elevation: 12
										},
										web: {
											boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)'
										}
									})
								}}
							>
								{state.routes.map((route: any, index: number) => {
									const { options } = descriptors[route.key]
									const isFocused = state.index === index

									// Skip rendering items hidden by href: null
									if (options.href === null) return null

									const onPress = () => {
										const event = navigation.emit({
											type: 'tabPress',
											target: route.key,
											canPreventDefault: true
										})

										if (!isFocused && !event.defaultPrevented) {
											navigation.navigate(route.name, route.params)
										}
									}

									const color = isFocused ? colors.primary : colors.textTertiary
									const icon = options.tabBarIcon ? options.tabBarIcon({ focused: isFocused, color }) : null

									return (
										<TouchableOpacity
											key={route.key}
											onPress={onPress}
											activeOpacity={0.7}
											style={{
												flex: 1,
												justifyContent: 'center',
												alignItems: 'center',
												height: '100%',
												position: 'relative'
											}}
											accessibilityRole="button"
											accessibilityState={isFocused ? { selected: true } : {}}
											accessibilityLabel={options.tabBarAccessibilityLabel}
										>
											{icon}
											{options.tabBarBadge !== undefined && (
												<View
													style={[
														options.tabBarBadgeStyle,
														{
															position: 'absolute',
															top: 4,
															right: 10,
															justifyContent: 'center',
															alignItems: 'center'
														}
													]}
												>
													<Text style={{ color: '#fff', fontSize: 9, fontWeight: '700', lineHeight: 12 }}>{options.tabBarBadge}</Text>
												</View>
											)}
										</TouchableOpacity>
									)
								})}
							</View>
						</View>
					)
				}}
				screenOptions={{
					headerShown: true,
					header: (props: any) => <SmartHeader {...props} />
				}}
			>
				<Tabs.Screen
					name="feed"
					options={{
						tabBarIcon: ({ color, focused }) => renderTabBarIcon('home', 'home-outline', 'ionicons', color, focused),
						tabBarAccessibilityLabel: translate('feed', 'Feed')
					}}
				/>
				<Tabs.Screen
					name="dashboard"
					options={{
						href: isDashboardVisible ? '/dashboard' : null,
						tabBarIcon: ({ color, focused }) => renderTabBarIcon('grid', 'grid-outline', 'ionicons', color, focused),
						tabBarAccessibilityLabel: translate('dashboard', 'Dashboard')
					}}
				/>
				<Tabs.Screen
					name="notifications"
					options={{
						href: isNotificationsVisible ? '/notifications' : null,
						tabBarBadge: notificationCount > 0 ? notificationCount : undefined,
						tabBarBadgeStyle: {
							backgroundColor: colors.error,
							color: '#fff',
							fontSize: 9,
							minWidth: 16,
							height: 16,
							borderRadius: 8,
							lineHeight: 16
						},
						tabBarIcon: ({ color, focused }) => renderTabBarIcon('notifications', 'notifications-outline', 'ionicons', color, focused),
						tabBarAccessibilityLabel: translate('notifications', 'Notifications')
					}}
				/>
				<Tabs.Screen
					name="profile"
					options={{
						tabBarIcon: ({ color, focused }) => renderTabBarIcon('person', 'person-outline', 'ionicons', color, focused),
						tabBarAccessibilityLabel: translate('profile', 'Profile')
					}}
				/>
			</TabsComponent>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	}
})
