/**
 * SmartVideoPlayer — plays/pauses/resumes media video files using expo-video.
 */

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { useEventListener } from 'expo'
import { VideoView, useVideoPlayer, type VideoPlayerStatus } from 'expo-video'
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
		if (String(error?.message || '').includes('Cannot use shared object') || String(error?.message || '').includes('player')) {
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
	({ source, style, contentFit = 'cover', nativeControls = true, controls = true, autoPlay = false, loop = false, accessibilityLabel, testID, onPlaybackEnd, onError }, ref) => {
		const player = useVideoPlayer(source, (instance) => {
			instance.loop = loop
			// Mute feed videos (no controls) to allow autoplay on web/iOS
			if (!controls) {
				try {
					instance.muted = true
				} catch {}
			}
		})

		// Handle source changes via replaceAsync instead of recreating player (avoids SharedObject release race)
		const prevSourceRef = React.useRef(source)
		useEffect(() => {
			if (prevSourceRef.current === source) return
			prevSourceRef.current = source
			let cancelled = false
			const updateSource = async () => {
				try {
					if (cancelled || !isMountedRef.current) return
					// Use replaceAsync for smooth source change without releasing SharedObject
					if (typeof (player as any).replaceAsync === 'function') {
						await (player as any).replaceAsync({ uri: source })
					} else if (typeof (player as any).replace === 'function') {
						;(player as any).replace({ uri: source })
					}
					if (!controls && isMountedRef.current) {
						try {
							player.muted = true
						} catch {}
					}
					if (isMountedRef.current) {
						player.loop = loop
					}
				} catch {}
			}
			updateSource()
			return () => {
				cancelled = true
			}
		}, [source, player, controls, loop])

		const [status, setStatus] = useState<VideoPlayerStatus>(player.status ?? 'idle')
		const [playing, setPlaying] = useState(autoPlay)
		const isMountedRef = React.useRef(true)
		useEffect(() => {
			isMountedRef.current = true
			return () => {
				isMountedRef.current = false
				try {
					player.pause()
				} catch {}
			}
		}, [player])

		useEventListener(player, 'statusChange', ({ status: nextStatus }) => {
			if (!isMountedRef.current) return
			setStatus(nextStatus)
			if (nextStatus === 'error') {
				onError?.()
			}
		})

		useEventListener(player, 'playingChange', ({ isPlaying }) => {
			if (!isMountedRef.current) return
			setPlaying(isPlaying)
		})

		useEventListener(player, 'playToEnd', () => {
			if (!isMountedRef.current) return
			onPlaybackEnd?.()
		})

		// Autoplay when ready — required for feed carousel (controls=false, muted)
		useEffect(() => {
			if (!autoPlay || status !== 'readyToPlay' || !isMountedRef.current) return
			try {
				if (!controls) {
					player.muted = true
				}
				const playPromise: any = player.play()
				if (playPromise && typeof playPromise.catch === 'function') {
					playPromise.catch(() => {})
				}
			} catch {}
		}, [autoPlay, status, controls, player])

		// Pause when autoPlay becomes false (card scrolled off-screen) — prevents bleed
		useEffect(() => {
			if (!autoPlay && isMountedRef.current) {
				try {
					if (player.playing) player.pause()
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
				if (player.playing) {
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
			<View style={[styles.container, style]} testID={testID} accessibilityLabel={accessibilityLabel}>
				<VideoErrorBoundary key={source}>
					<VideoView
						surfaceType="textureView"
						key={source}
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
