/**
 * SmartVideoPlayer — plays/pauses/resumes media video files using expo-video.
 */

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { useEventListener } from 'expo'
import { VideoView, createVideoPlayer, type VideoPlayer, type VideoPlayerStatus } from 'expo-video'
import { Ionicons } from '@expo/vector-icons'
import Spinner from '@/features/common/Spinner'
import { themeColors } from '@/core/theme'

export type VideoContentFit = 'cover' | 'contain' | 'fill'

export interface SmartVideoPlayerProps {
	source: string
	style?: StyleProp<ViewStyle>
	contentFit?: VideoContentFit
	/** Whether to use the native platform controls. Defaults to true. */
	nativeControls?: boolean
	/** Whether to show any controls (native + custom play button). Defaults to true. When false, no controls are rendered. */
	controls?: boolean
	/** Start playback automatically once ready. Defaults to false. */
	autoPlay?: boolean
	/** Loop the video. Defaults to false. */
	loop?: boolean
	accessibilityLabel?: string
	testID?: string
	/** Called when playback reaches the end. */
	onPlaybackEnd?: () => void
	/** Called when the player encounters an error. */
	onError?: () => void
	/** Called when playing state changes (for first-frame tracking). */
	onPlayingChange?: (isPlaying: boolean) => void
}

export interface SmartVideoPlayerHandle {
	play: () => void
	pause: () => void
	resume: () => void
	toggle: () => void
}

class VideoErrorBoundary extends React.Component<{ children: React.ReactNode; fallback?: React.ReactNode }, { hasError: boolean }> {
	state = { hasError: false }
	static getDerivedStateFromError() {
		return { hasError: true }
	}
	componentDidCatch(error: any) {
		// SurfaceVideoView shared-object errors are non-fatal — show fallback
		const errorMessage = String(error?.message || '')
		if (errorMessage.includes('Cannot use shared object') || errorMessage.includes('player') || errorMessage.includes('already released')) {
			// Suppress these expected expo-video race condition errors
			return
		}
	}
	render() {
		if (this.state.hasError) {
			return (
				(this.props.fallback as any) ?? (
					<View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
						<Ionicons name="videocam-off-outline" size={32} color={themeColors.textTertiary} />
					</View>
				)
			)
		}
		return this.props.children as any
	}
}

const PlaybackButton = ({ playing, onPress }: { playing: boolean; onPress: () => void }) => (
	<TouchableOpacity onPress={onPress} style={styles.playbackButton} accessibilityRole="button" accessibilityLabel={playing ? 'Pause video' : 'Play video'}>
		<Ionicons name={playing ? 'pause' : 'play'} size={28} color={themeColors.buttonText} />
	</TouchableOpacity>
)

const SmartVideoPlayerComponent = forwardRef<SmartVideoPlayerHandle, SmartVideoPlayerProps>(
	({ source, style, contentFit = 'contain', nativeControls = true, controls = true, autoPlay = false, loop = false, accessibilityLabel, testID, onPlaybackEnd, onError, onPlayingChange }, ref) => {
		// Use createVideoPlayer instead of useVideoPlayer to avoid useReleasingSharedObject
		// prematurely releasing the native VideoPlayer during component unmount while
		// Android TextureVideoView is still detaching in the native view hierarchy.
		const player = useMemo(() => {
			const instance = createVideoPlayer(source ? { uri: source } : null)
			try {
				instance.loop = loop
			} catch {}
			if (!controls || autoPlay) {
				try {
					instance.muted = true
				} catch {}
			}
			return instance
		}, [])

		const [status, setStatus] = useState<VideoPlayerStatus>(player?.status ?? 'idle')
		const [playing, setPlaying] = useState(autoPlay)
		const isMountedRef = React.useRef(true)
		const prevSourceRef = React.useRef(source)

		useEffect(() => {
			isMountedRef.current = true
			return () => {
				isMountedRef.current = false
				try {
					if ((player as any)?.playing) player.pause()
				} catch {}
				// Defer release to allow native Android view teardown to complete cleanly
				// and prevent "Cannot use shared object that was already released" crashes.
				setTimeout(() => {
					try {
						if (typeof (player as any)?.release === 'function') {
							player.release()
						}
					} catch {}
				}, 1000)
			}
		}, [player])

		// Load/replace source on the stable player when source prop changes.
		useEffect(() => {
			if (prevSourceRef.current === source) return
			prevSourceRef.current = source
			if (!source) return
			let cancelled = false
			;(async () => {
				try {
					if (cancelled || !isMountedRef.current) return
					const p: any = player as any
					if (typeof p.replaceAsync === 'function') {
						await p.replaceAsync({ uri: source })
					} else if (typeof p.replace === 'function') {
						p.replace({ uri: source })
					}
					if (cancelled || !isMountedRef.current) return
					try {
						player.loop = loop
					} catch {}
					try {
						player.muted = !controls || autoPlay ? true : false
					} catch {}
				} catch {}
			})()
			return () => {
				cancelled = true
			}
		}, [source, player, loop, controls, autoPlay])

		useEventListener(player, 'statusChange', ({ status: nextStatus }) => {
			if (!isMountedRef.current) return
			try {
				setStatus(nextStatus)
				if (nextStatus === 'error') {
					onError?.()
				}
			} catch {}
		})

		useEventListener(player, 'playingChange', ({ isPlaying }) => {
			if (!isMountedRef.current) return
			try {
				setPlaying(isPlaying)
				onPlayingChange?.(isPlaying)
			} catch {}
		})

		useEventListener(player, 'playToEnd', () => {
			if (!isMountedRef.current) return
			try {
				onPlaybackEnd?.()
			} catch {}
		})

		// Autoplay when ready — required for feed carousel (controls=false, muted) — must be muted on web for autoplay
		useEffect(() => {
			if (!autoPlay || status !== 'readyToPlay' || !isMountedRef.current) return
			try {
				// Always mute for autoplay to satisfy web/iOS autoplay policies
				player.muted = true
				const playPromise: any = player.play()
				if (playPromise && typeof playPromise.catch === 'function') {
					playPromise.catch(() => {})
				}
			} catch {}
		}, [autoPlay, status, player])

		// Pause when autoPlay becomes false (card scrolled off-screen or not focused) — prevents bleed
		useEffect(() => {
			if (!autoPlay && isMountedRef.current) {
				try {
					if ((player as any)?.playing) player.pause()
				} catch {}
			}
		}, [autoPlay, player])

		useEffect(() => {
			try {
				player.loop = loop
			} catch {}
		}, [player, loop])

		useEffect(() => {
			try {
				if (!controls) {
					player.muted = true
				} else {
					player.muted = false
				}
			} catch {}
		}, [player, controls])

		const play = useCallback(() => {
			try {
				const p: any = player.play()
				if (p && typeof p.catch === 'function') p.catch(() => {})
			} catch {}
		}, [player])

		const pause = useCallback(() => {
			try {
				player.pause()
			} catch {}
		}, [player])

		const resume = useCallback(() => {
			try {
				const p: any = player.play()
				if (p && typeof p.catch === 'function') p.catch(() => {})
			} catch {}
		}, [player])

		const toggle = useCallback(() => {
			try {
				if ((player as any)?.playing) {
					player.pause()
				} else {
					const p: any = player.play()
					if (p && typeof p.catch === 'function') p.catch(() => {})
				}
			} catch {}
		}, [player])

		useImperativeHandle(ref, () => ({ play, pause, resume, toggle }), [play, pause, resume, toggle])

		const isLoading = status === 'loading' || status === 'idle'
		const hasError = status === 'error'

		const playbackOverlay = useMemo(() => {
			if (!controls || nativeControls || hasError) return null
			return (
				<View style={[styles.overlay, { pointerEvents: 'box-none' }]}>
					<PlaybackButton playing={playing} onPress={toggle} />
				</View>
			)
		}, [controls, nativeControls, hasError, playing, toggle])

		if (hasError) {
			return (
				<View style={[styles.container, style]}>
					<Ionicons name="videocam-off-outline" size={32} color={themeColors.textTertiary} />
				</View>
			)
		}

		return (
			<View style={[styles.container, style]} testID={testID} accessibilityLabel={accessibilityLabel} collapsable={false}>
				<VideoErrorBoundary>
					<VideoView
						surfaceType="textureView"
						player={player}
						style={StyleSheet.absoluteFill}
						contentFit={contentFit}
						nativeControls={controls ? nativeControls : false}
						allowsPictureInPicture={false}
					/>
				</VideoErrorBoundary>
				{isLoading && (
					<View style={[styles.loadingOverlay, { pointerEvents: 'none' }]}>
						<Spinner size="small" expand={false} />
					</View>
				)}
				{playbackOverlay}
			</View>
		)
	}
)

const styles = StyleSheet.create({
	container: {
		width: '100%',
		height: '100%',
		overflow: 'hidden',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: themeColors.background
	},
	loadingOverlay: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: themeColors.background50
	},
	overlay: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
		justifyContent: 'center',
		alignItems: 'center'
	},
	playbackButton: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: themeColors.background75,
		justifyContent: 'center',
		alignItems: 'center'
	}
})

export const SmartVideoPlayer = React.memo(SmartVideoPlayerComponent)
export default SmartVideoPlayer
