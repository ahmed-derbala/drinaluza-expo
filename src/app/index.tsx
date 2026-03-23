import React, { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Platform } from 'react-native'
import { Redirect } from 'expo-router'
import AnimatedSplashScreen from '@/components/splash/AnimatedSplashScreen'
import { getFeed } from '@/components/feed/feed.api'
import { API_TIMEOUT } from '@/config'
import { log } from '@/core/log'

// Minimum time splash is shown (so animations are visible)
const MIN_SPLASH_DURATION = 3000

export default function Index() {
	const [isReady, setIsReady] = useState(false)
	const fadeAnim = useRef(new Animated.Value(1)).current
	const startTimeRef = useRef(Date.now())
	const fadeOutStartedRef = useRef(false)

	useEffect(() => {
		let isMounted = true

		const finishSplash = () => {
			if (fadeOutStartedRef.current) return
			fadeOutStartedRef.current = true

			// Ensure minimum splash duration
			const elapsed = Date.now() - startTimeRef.current
			const remaining = Math.max(0, MIN_SPLASH_DURATION - elapsed)

			setTimeout(() => {
				if (!isMounted) return
				Animated.timing(fadeAnim, {
					toValue: 0,
					duration: 600,
					useNativeDriver: Platform.OS !== 'web'
				}).start(() => {
					if (isMounted) {
						setIsReady(true)
					}
				})
			}, remaining)
		}

		const prefetchFeed = async () => {
			try {
				// Race between feed fetch and timeout
				await Promise.race([getFeed(1, 10), new Promise((_, reject) => setTimeout(() => reject(new Error('Splash timeout')), API_TIMEOUT))])

				log({
					level: 'info',
					label: 'splash',
					message: 'Feed prefetched successfully'
				})
			} catch (err) {
				// Timeout or error — proceed anyway
				log({
					level: 'warn',
					label: 'splash',
					message: 'Feed prefetch failed or timed out, proceeding',
					error: err
				})
			} finally {
				if (isMounted) {
					finishSplash()
				}
			}
		}

		prefetchFeed()

		return () => {
			isMounted = false
		}
	}, [])

	if (isReady) {
		return <Redirect href="/feed" />
	}

	return (
		<Animated.View style={[styles.container, { opacity: fadeAnim }]}>
			<AnimatedSplashScreen />
		</Animated.View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	}
})
