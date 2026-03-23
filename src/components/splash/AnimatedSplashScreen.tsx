import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, Easing, Dimensions, Platform } from 'react-native'
import { colors } from '@/config/theme'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const USE_NATIVE = Platform.OS !== 'web'

// Bubble configuration
const BUBBLES = Array.from({ length: 12 }, (_, i) => ({
	id: i,
	size: Math.random() * 12 + 6,
	left: Math.random() * SCREEN_WIDTH,
	delay: Math.random() * 3000,
	duration: Math.random() * 2000 + 3000
}))

// Wave configuration
const WAVE_COUNT = 3

interface AnimatedSplashScreenProps {
	onAnimationReady?: () => void
}

export default function AnimatedSplashScreen({ onAnimationReady }: AnimatedSplashScreenProps) {
	// Dolphin animations
	const dolphinY = useRef(new Animated.Value(0)).current
	const dolphinRotate = useRef(new Animated.Value(0)).current
	const dolphinScale = useRef(new Animated.Value(0.3)).current

	// Splash ring
	const splashRingScale = useRef(new Animated.Value(0)).current
	const splashRingOpacity = useRef(new Animated.Value(0)).current

	// Title & subtitle
	const titleOpacity = useRef(new Animated.Value(0)).current
	const titleTranslateY = useRef(new Animated.Value(30)).current
	const subtitleOpacity = useRef(new Animated.Value(0)).current

	// Glow pulse
	const glowOpacity = useRef(new Animated.Value(0.3)).current

	// Waves
	const waveAnims = useRef(Array.from({ length: WAVE_COUNT }, () => new Animated.Value(0))).current

	// Bubbles
	const bubbleAnims = useRef(
		BUBBLES.map(() => ({
			translateY: new Animated.Value(0),
			opacity: new Animated.Value(0)
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
		// 1. Dolphin entrance — scale up and bounce in
		Animated.sequence([
			Animated.spring(dolphinScale, {
				toValue: 1,
				friction: 4,
				tension: 50,
				useNativeDriver: USE_NATIVE
			}),
			// Splash ring on landing
			Animated.parallel([
				Animated.timing(splashRingScale, {
					toValue: 2.5,
					duration: 600,
					easing: Easing.out(Easing.cubic),
					useNativeDriver: USE_NATIVE
				}),
				Animated.timing(splashRingOpacity, {
					toValue: 0,
					duration: 600,
					useNativeDriver: USE_NATIVE
				})
			])
		]).start()

		// Splash ring initial opacity
		Animated.timing(splashRingOpacity, {
			toValue: 0.6,
			duration: 100,
			delay: 500,
			useNativeDriver: USE_NATIVE
		}).start()

		// 2. Dolphin continuous jump animation
		const dolphinJump = () => {
			Animated.loop(
				Animated.sequence([
					// Jump up
					Animated.parallel([
						Animated.timing(dolphinY, {
							toValue: -35,
							duration: 1200,
							easing: Easing.out(Easing.cubic),
							useNativeDriver: USE_NATIVE
						}),
						Animated.timing(dolphinRotate, {
							toValue: -0.15,
							duration: 1200,
							easing: Easing.out(Easing.cubic),
							useNativeDriver: USE_NATIVE
						})
					]),
					// Come back down
					Animated.parallel([
						Animated.timing(dolphinY, {
							toValue: 0,
							duration: 1200,
							easing: Easing.in(Easing.cubic),
							useNativeDriver: USE_NATIVE
						}),
						Animated.timing(dolphinRotate, {
							toValue: 0.15,
							duration: 1200,
							easing: Easing.in(Easing.cubic),
							useNativeDriver: USE_NATIVE
						})
					]),
					// Slight pause at bottom
					Animated.delay(200)
				])
			).start()
		}
		setTimeout(dolphinJump, 600)

		// 3. Title fade in
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

		// 4. Subtitle fade in
		Animated.timing(subtitleOpacity, {
			toValue: 1,
			duration: 600,
			delay: 1200,
			useNativeDriver: USE_NATIVE
		}).start()

		// 5. Glow pulse
		Animated.loop(
			Animated.sequence([
				Animated.timing(glowOpacity, {
					toValue: 0.8,
					duration: 1500,
					easing: Easing.inOut(Easing.sin),
					useNativeDriver: USE_NATIVE
				}),
				Animated.timing(glowOpacity, {
					toValue: 0.3,
					duration: 1500,
					easing: Easing.inOut(Easing.sin),
					useNativeDriver: USE_NATIVE
				})
			])
		).start()

		// 6. Wave animations
		waveAnims.forEach((anim, index) => {
			Animated.loop(
				Animated.timing(anim, {
					toValue: 1,
					duration: 3000 + index * 500,
					easing: Easing.inOut(Easing.sin),
					useNativeDriver: USE_NATIVE
				})
			).start()
		})

		// 7. Bubble animations
		bubbleAnims.forEach((bubble, index) => {
			bubble.translateY.setValue(0)
			bubble.opacity.setValue(0)

			Animated.loop(
				Animated.sequence([
					Animated.delay(BUBBLES[index].delay),
					Animated.parallel([
						Animated.timing(bubble.translateY, {
							toValue: -(SCREEN_HEIGHT * 0.5),
							duration: BUBBLES[index].duration,
							easing: Easing.out(Easing.quad),
							useNativeDriver: USE_NATIVE
						}),
						Animated.sequence([
							Animated.timing(bubble.opacity, {
								toValue: 0.6,
								duration: 500,
								useNativeDriver: USE_NATIVE
							}),
							Animated.timing(bubble.opacity, {
								toValue: 0,
								duration: BUBBLES[index].duration - 500,
								useNativeDriver: USE_NATIVE
							})
						])
					])
				])
			).start()
		})

		// 8. Loading dots
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

	const dolphinRotateInterpolate = dolphinRotate.interpolate({
		inputRange: [-1, 1],
		outputRange: ['-30deg', '30deg']
	})

	return (
		<View style={styles.container}>
			{/* Deep ocean gradient simulation via layered views */}
			<View style={styles.gradientTop} />
			<View style={styles.gradientBottom} />

			{/* Bubbles */}
			{BUBBLES.map((bubble, index) => (
				<Animated.View
					key={bubble.id}
					style={[
						styles.bubble,
						{
							width: bubble.size,
							height: bubble.size,
							borderRadius: bubble.size / 2,
							left: bubble.left,
							bottom: SCREEN_HEIGHT * 0.15,
							transform: [{ translateY: bubbleAnims[index].translateY }],
							opacity: bubbleAnims[index].opacity
						}
					]}
				/>
			))}

			{/* Center content */}
			<View style={styles.centerContent}>
				{/* Glow behind dolphin */}
				<Animated.View
					style={[
						styles.glow,
						{
							opacity: glowOpacity,
							transform: [{ scale: dolphinScale }]
						}
					]}
				/>

				{/* Splash ring */}
				<Animated.View
					style={[
						styles.splashRing,
						{
							opacity: splashRingOpacity,
							transform: [{ scale: splashRingScale }]
						}
					]}
				/>

				{/* Dolphin */}
				<Animated.View
					style={[
						styles.dolphinContainer,
						{
							transform: [{ translateY: dolphinY }, { rotate: dolphinRotateInterpolate }, { scale: dolphinScale }]
						}
					]}
				>
					<Text style={styles.dolphinEmoji}>🐬</Text>
				</Animated.View>

				{/* Water ripple lines */}
				<View style={styles.rippleContainer}>
					{waveAnims.map((anim, index) => {
						const translateX = anim.interpolate({
							inputRange: [0, 0.5, 1],
							outputRange: [-20 - index * 10, 20 + index * 10, -20 - index * 10]
						})
						return (
							<Animated.View
								key={index}
								style={[
									styles.rippleLine,
									{
										width: 60 + index * 30,
										opacity: 0.3 - index * 0.08,
										marginTop: 4 + index * 3,
										transform: [{ translateX }]
									}
								]}
							/>
						)
					})}
				</View>
			</View>

			{/* Title */}
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

			{/* Subtitle */}
			<Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>Seafood Market & Manager</Animated.Text>

			{/* Loading indicator */}
			<View style={styles.loadingContainer}>
				<Animated.View style={[styles.loadingDot, { transform: [{ translateY: dot1 }] }]} />
				<Animated.View style={[styles.loadingDot, { transform: [{ translateY: dot2 }] }]} />
				<Animated.View style={[styles.loadingDot, { transform: [{ translateY: dot3 }] }]} />
			</View>

			{/* Bottom wave shapes */}
			<View style={styles.wavesContainer}>
				{waveAnims.map((anim, index) => {
					const translateX = anim.interpolate({
						inputRange: [0, 0.5, 1],
						outputRange: [0, 30, 0]
					})
					return (
						<Animated.View
							key={`wave-${index}`}
							style={[
								styles.wave,
								{
									bottom: index * 18,
									opacity: 0.08 + index * 0.04,
									height: 50 + index * 10,
									transform: [{ translateX }]
								}
							]}
						/>
					)
				})}
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
		marginBottom: 24
	},
	glow: {
		position: 'absolute',
		width: 180,
		height: 180,
		borderRadius: 90,
		backgroundColor: colors.primary,
		opacity: 0.15
	},
	splashRing: {
		position: 'absolute',
		width: 80,
		height: 80,
		borderRadius: 40,
		borderWidth: 3,
		borderColor: colors.primary
	},
	dolphinContainer: {
		width: 120,
		height: 120,
		justifyContent: 'center',
		alignItems: 'center'
	},
	dolphinEmoji: {
		fontSize: 80
	},
	rippleContainer: {
		alignItems: 'center',
		marginTop: -8
	},
	rippleLine: {
		height: 2,
		borderRadius: 1,
		backgroundColor: colors.primaryLight
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
	},
	bubble: {
		position: 'absolute',
		backgroundColor: 'rgba(56, 189, 248, 0.15)',
		borderWidth: 1,
		borderColor: 'rgba(56, 189, 248, 0.25)'
	},
	wavesContainer: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		height: 100,
		overflow: 'hidden'
	},
	wave: {
		position: 'absolute',
		left: -50,
		right: -50,
		backgroundColor: colors.primary,
		borderTopLeftRadius: 1000,
		borderTopRightRadius: 1000
	}
})
