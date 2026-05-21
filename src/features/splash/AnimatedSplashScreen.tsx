import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, Easing, Dimensions, Platform } from 'react-native'
import { colors } from '@/core/theme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const USE_NATIVE = Platform.OS !== 'web'

// Business icons representing different types of small businesses
const BUSINESS_ICONS = [
	{ name: 'fish-outline', color: '#38BDF8', label: 'Seafood' }, // Sky
	{ name: 'cafe-outline', color: '#FBBF24', label: 'Cafe' }, // Amber
	{ name: 'cut-outline', color: '#F87171', label: 'Barber' }, // Red
	{ name: 'cart-outline', color: '#34D399', label: 'Retail' }, // Emerald
	{ name: 'shirt-outline', color: '#A78BFA', label: 'Boutique' }, // Purple
	{ name: 'restaurant-outline', color: '#FB923C', label: 'Restaurant' } // Orange
]

interface AnimatedSplashScreenProps {
	onAnimationReady?: () => void
}

export default function AnimatedSplashScreen({ onAnimationReady }: AnimatedSplashScreenProps) {
	// Central icon animations
	const centerScale = useRef(new Animated.Value(0.5)).current
	const centerOpacity = useRef(new Animated.Value(0)).current

	// Title & subtitle
	const titleOpacity = useRef(new Animated.Value(0)).current
	const titleTranslateY = useRef(new Animated.Value(20)).current
	const subtitleOpacity = useRef(new Animated.Value(0)).current

	// Glow pulse
	const glowScale = useRef(new Animated.Value(0.8)).current
	const glowOpacity = useRef(new Animated.Value(0)).current

	// Floating business icons
	const iconAnims = useRef(
		BUSINESS_ICONS.map(() => ({
			scale: new Animated.Value(0),
			opacity: new Animated.Value(0),
			translateY: new Animated.Value(20),
			float: new Animated.Value(0)
		}))
	).current

	// Loading dots
	const dot1 = useRef(new Animated.Value(0)).current
	const dot2 = useRef(new Animated.Value(0)).current
	const dot3 = useRef(new Animated.Value(0)).current

	useEffect(() => {
		startAnimations()
		onAnimationReady?.()
	}, [])

	const startAnimations = () => {
		// 1. Center icon entrance
		Animated.parallel([
			Animated.spring(centerScale, {
				toValue: 1,
				friction: 5,
				tension: 40,
				useNativeDriver: USE_NATIVE
			}),
			Animated.timing(centerOpacity, {
				toValue: 1,
				duration: 800,
				useNativeDriver: USE_NATIVE
			})
		]).start()

		// 2. Glow pulse behind center icon
		Animated.loop(
			Animated.parallel([
				Animated.sequence([
					Animated.timing(glowScale, {
						toValue: 1.5,
						duration: 2000,
						easing: Easing.out(Easing.cubic),
						useNativeDriver: USE_NATIVE
					}),
					Animated.timing(glowScale, {
						toValue: 0.8,
						duration: 0,
						useNativeDriver: USE_NATIVE
					})
				]),
				Animated.sequence([
					Animated.timing(glowOpacity, {
						toValue: 0.3,
						duration: 1000,
						easing: Easing.out(Easing.cubic),
						useNativeDriver: USE_NATIVE
					}),
					Animated.timing(glowOpacity, {
						toValue: 0,
						duration: 1000,
						easing: Easing.in(Easing.cubic),
						useNativeDriver: USE_NATIVE
					})
				])
			])
		).start()

		// 3. Floating business icons entrance
		iconAnims.forEach((anim, index) => {
			const delay = 400 + index * 150
			Animated.sequence([
				Animated.delay(delay),
				Animated.parallel([
					Animated.spring(anim.scale, {
						toValue: 1,
						friction: 6,
						tension: 40,
						useNativeDriver: USE_NATIVE
					}),
					Animated.timing(anim.opacity, {
						toValue: 0.8,
						duration: 400,
						useNativeDriver: USE_NATIVE
					}),
					Animated.timing(anim.translateY, {
						toValue: 0,
						duration: 500,
						easing: Easing.out(Easing.back(1.5)),
						useNativeDriver: USE_NATIVE
					})
				])
			]).start(() => {
				// Continuous floating after entrance
				Animated.loop(
					Animated.sequence([
						Animated.timing(anim.float, {
							toValue: -10,
							duration: 1500 + Math.random() * 1000,
							easing: Easing.inOut(Easing.sin),
							useNativeDriver: USE_NATIVE
						}),
						Animated.timing(anim.float, {
							toValue: 0,
							duration: 1500 + Math.random() * 1000,
							easing: Easing.inOut(Easing.sin),
							useNativeDriver: USE_NATIVE
						})
					])
				).start()
			})
		})

		// 4. Title & Subtitle fade in
		Animated.parallel([
			Animated.timing(titleOpacity, {
				toValue: 1,
				duration: 800,
				delay: 800,
				useNativeDriver: USE_NATIVE
			}),
			Animated.timing(titleTranslateY, {
				toValue: 0,
				duration: 800,
				delay: 800,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: USE_NATIVE
			})
		]).start()

		Animated.timing(subtitleOpacity, {
			toValue: 1,
			duration: 600,
			delay: 1200,
			useNativeDriver: USE_NATIVE
		}).start()

		// 5. Loading dots
		const animateDot = (dot: Animated.Value, delay: number) => {
			Animated.loop(
				Animated.sequence([
					Animated.delay(delay),
					Animated.timing(dot, {
						toValue: -8,
						duration: 400,
						easing: Easing.out(Easing.cubic),
						useNativeDriver: USE_NATIVE
					}),
					Animated.timing(dot, {
						toValue: 0,
						duration: 400,
						easing: Easing.in(Easing.cubic),
						useNativeDriver: USE_NATIVE
					})
				])
			).start()
		}
		animateDot(dot1, 0)
		animateDot(dot2, 150)
		animateDot(dot3, 300)
	}

	// Calculate positions for floating icons in a circle
	const radius = SCREEN_WIDTH > 400 ? 140 : 110
	const getIconPosition = (index: number, total: number) => {
		const angle = (index / total) * Math.PI * 2 - Math.PI / 2 // Start from top
		return {
			x: Math.cos(angle) * radius,
			y: Math.sin(angle) * radius
		}
	}

	return (
		<View style={styles.container}>
			<View style={styles.gradientTop} />
			<View style={styles.gradientBottom} />

			<View style={styles.centerContent}>
				{/* Background Glow */}
				<Animated.View
					style={[
						styles.glow,
						{
							opacity: glowOpacity,
							transform: [{ scale: glowScale }]
						}
					]}
				/>

				{/* Floating Business Icons */}
				<View style={styles.orbitContainer}>
					{BUSINESS_ICONS.map((icon, index) => {
						const pos = getIconPosition(index, BUSINESS_ICONS.length)
						const anim = iconAnims[index]
						return (
							<Animated.View
								key={icon.name}
								style={[
									styles.floatingIconWrapper,
									{
										transform: [{ translateX: pos.x }, { translateY: pos.y }, { translateY: anim.translateY }, { translateY: anim.float }, { scale: anim.scale }],
										opacity: anim.opacity
									}
								]}
							>
								<View style={[styles.iconCircle, { backgroundColor: `${icon.color}15`, borderColor: `${icon.color}30` }]}>
									<Ionicons name={icon.name as any} size={24} color={icon.color} />
								</View>
							</Animated.View>
						)
					})}
				</View>

				{/* Central Store Icon */}
				<Animated.View
					style={[
						styles.centerIconContainer,
						{
							opacity: centerOpacity,
							transform: [{ scale: centerScale }]
						}
					]}
				>
					<LinearGradient colors={[colors.primaryContainer, colors.surface]} style={styles.centerIconBg}>
						<Ionicons name="storefront" size={54} color={colors.primary} />
					</LinearGradient>
				</Animated.View>
			</View>

			{/* Title Section */}
			<Animated.View
				style={[
					styles.titleContainer,
					{
						opacity: titleOpacity,
						transform: [{ translateY: titleTranslateY }]
					}
				]}
			>
				<Text style={styles.title}>Drinaluza</Text>
			</Animated.View>

			<Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>Business Manager</Animated.Text>

			{/* Loading indicator */}
			<View style={styles.loadingContainer}>
				<Animated.View style={[styles.loadingDot, { transform: [{ translateY: dot1 }] }]} />
				<Animated.View style={[styles.loadingDot, { transform: [{ translateY: dot2 }] }]} />
				<Animated.View style={[styles.loadingDot, { transform: [{ translateY: dot3 }] }]} />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.background,
		justifyContent: 'center',
		alignItems: 'center'
	},
	gradientTop: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		height: SCREEN_HEIGHT * 0.4,
		backgroundColor: '#030B1A',
		opacity: 0.7
	},
	gradientBottom: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		height: SCREEN_HEIGHT * 0.3,
		backgroundColor: '#0C4A6E',
		opacity: 0.15
	},
	centerContent: {
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 40,
		height: 300,
		width: 300
	},
	glow: {
		position: 'absolute',
		width: 160,
		height: 160,
		borderRadius: 80,
		backgroundColor: colors.primary,
		opacity: 0.15
	},
	orbitContainer: {
		position: 'absolute',
		width: '100%',
		height: '100%',
		alignItems: 'center',
		justifyContent: 'center'
	},
	floatingIconWrapper: {
		position: 'absolute'
	},
	iconCircle: {
		width: 48,
		height: 48,
		borderRadius: 24,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.3,
				shadowRadius: 5
			},
			android: { elevation: 6 },
			web: {
				boxShadow: '0px 4px 10px rgba(0,0,0,0.3)',
				backdropFilter: 'blur(4px)'
			}
		})
	},
	centerIconContainer: {
		width: 110,
		height: 110,
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({
			ios: {
				shadowColor: colors.primary,
				shadowOffset: { width: 0, height: 8 },
				shadowOpacity: 0.4,
				shadowRadius: 15
			},
			android: { elevation: 12 },
			web: {
				boxShadow: `0px 10px 30px ${colors.primary}40`
			}
		})
	},
	centerIconBg: {
		width: '100%',
		height: '100%',
		borderRadius: 35,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 2,
		borderColor: `${colors.primary}50`
	},
	titleContainer: {
		marginBottom: 8
	},
	title: {
		fontSize: 42,
		fontWeight: '800',
		color: colors.text,
		letterSpacing: 2,
		textShadowColor: colors.primary,
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 20
	},
	subtitle: {
		fontSize: 16,
		fontWeight: '500',
		color: colors.textSecondary,
		letterSpacing: 4,
		textTransform: 'uppercase',
		marginBottom: 40
	},
	loadingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		position: 'absolute',
		bottom: SCREEN_HEIGHT * 0.12
	},
	loadingDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: colors.primary
	}
})
