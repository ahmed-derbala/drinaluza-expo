import React, { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import * as NativeSplashScreen from 'expo-splash-screen'
import AnimatedSplashScreen from './AnimatedSplashScreen'
import { getFeed } from '@/features/feed/feed.api'
import { API_TIMEOUT } from '@/config'
import { log } from '@/core/log'
import { useAppUpdater } from '@/core/app-updater/AppUpdaterContext'

// Minimum time splash is shown (so animations are visible)
const MIN_SPLASH_DURATION = 3000

export default function SplashScreen() {
	const { startupState, setAppFullyLoaded } = useAppUpdater()
	const router = useRouter()
	const [isFeedPrefetched, setIsFeedPrefetched] = useState(false)
	const fadeAnim = useRef(new Animated.Value(1)).current
	const startTimeRef = useRef(Date.now())
	const fadeOutStartedRef = useRef(false)

	useEffect(() => {
		let isMounted = true

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
					setIsFeedPrefetched(true)
				}
			}
		}

		prefetchFeed()

		return () => {
			isMounted = false
		}
	}, [])

	useEffect(() => {
		let isMounted = true
		const isUpdateCheckDone = startupState !== 'initializing' && startupState !== 'checkingUpdate'

		if (isFeedPrefetched && isUpdateCheckDone) {
			if (fadeOutStartedRef.current) return
			fadeOutStartedRef.current = true

			// Ensure minimum splash duration
			const elapsed = Date.now() - startTimeRef.current
			const remaining = Math.max(0, MIN_SPLASH_DURATION - elapsed)

			setTimeout(async () => {
				if (!isMounted) return

				// Hide native splash screen so custom animations fade out beautifully
				try {
					await NativeSplashScreen.hideAsync()
				} catch (e) {
					log({
						level: 'warn',
						label: 'splash',
						message: 'Failed to hide native splash screen',
						error: e
					})
				}

				Animated.timing(fadeAnim, {
					toValue: 0,
					duration: 600,
					useNativeDriver: Platform.OS !== 'web'
				}).start(() => {
					if (isMounted) {
						if (startupState === 'updateRequired' || startupState === 'updateAvailable') {
							log({
								level: 'info',
								label: 'splash',
								message: `Splash animation complete, but update is active (${startupState}). Staying on gate screen.`
							})
						} else {
							log({
								level: 'info',
								label: 'splash',
								message: 'Splash complete. Redirecting to feed.'
							})
							setAppFullyLoaded(true)
							router.replace('/(home)/feed')
						}
					}
				})
			}, remaining)
		}

		return () => {
			isMounted = false
		}
	}, [isFeedPrefetched, startupState, setAppFullyLoaded, router])

	useEffect(() => {
		if (fadeOutStartedRef.current && (startupState === 'ready' || startupState === 'error')) {
			log({
				level: 'info',
				label: 'splash',
				message: 'App updates cleared. Transitioning to feed.'
			})
			setAppFullyLoaded(true)
			router.replace('/(home)/feed')
		}
	}, [startupState, setAppFullyLoaded, router])

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
