import React, { useEffect } from 'react'
import { Tabs, usePathname, useRouter } from 'expo-router'
import { View, Platform, StyleSheet, TouchableOpacity, Text } from 'react-native'
import { useLayout, useUser } from '@/core/contexts'
import { useNotification } from '@/features/notifications/NotificationContext'
import { useTheme } from '@/core/theme'
import { Ionicons } from '@expo/vector-icons'
import { useBackButton } from '@/core/hooks/useBackButton'
import { SmartHeader } from '@/core/smart-header'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function HomeLayout() {
	const { colors } = useTheme()
	const { isTabBarVisible, setTabBarVisible } = useLayout()
	const { translate, user } = useUser()
	const pathname = usePathname()
	const router = useRouter()
	const insets = useSafeAreaInsets()
	useBackButton()
	const isAuthenticated = !!user
	const { notificationCount } = useNotification()
	const isDashboardVisible = isAuthenticated && user?.role === 'business_owner'
	const isNotificationsVisible = isAuthenticated
	const activeTabsCount = 2 + (isDashboardVisible ? 1 : 0) + (isNotificationsVisible ? 1 : 0)
	const barWidth = activeTabsCount * 56

	useEffect(() => {
		setTabBarVisible(true)
	}, [pathname, setTabBarVisible])

	return (
		<View style={styles.container}>
			<Tabs
				tabBar={(props: any) => {
					const { state, descriptors, navigation } = props
					return (
						<View
							style={{
								position: 'absolute',
								bottom: 16 + insets.bottom,
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
									height: 52,
									flexDirection: 'row',
									backgroundColor: 'rgba(20, 20, 20, 0.85)',
									borderRadius: 26,
									borderWidth: 1,
									borderColor: colors.primary,
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
											boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)',
											backdropFilter: 'blur(20px)'
										}
									})
								}}
							>
								{state.routes.map((route: any, index: number) => {
									const { options } = descriptors[route.key]
									const isFocused = state.index === index

									if (options.isVisible === false) return null

									const onPress = () => {
										if (route.name === 'profile' && !isAuthenticated) {
											router.push('/auth')
											return
										}

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
															top: 6,
															right: 12,
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
					options={
						{
							isVisible: true,
							tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />,
							tabBarAccessibilityLabel: translate('feed', 'Feed')
						} as any
					}
				/>
				<Tabs.Screen
					name="dashboard"
					options={
						{
							href: isDashboardVisible ? '/dashboard' : null,
							isVisible: isDashboardVisible,
							tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />,
							tabBarAccessibilityLabel: translate('dashboard', 'Dashboard')
						} as any
					}
				/>
				<Tabs.Screen
					name="notifications"
					options={
						{
							href: isNotificationsVisible ? '/notifications' : null,
							isVisible: isNotificationsVisible,
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
							tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={22} color={color} />,
							tabBarAccessibilityLabel: translate('notifications', 'Notifications')
						} as any
					}
				/>
				<Tabs.Screen
					name="profile"
					options={
						{
							isVisible: true,
							tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />,
							tabBarAccessibilityLabel: translate('profile', 'Profile')
						} as any
					}
				/>
			</Tabs>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	}
})
