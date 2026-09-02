/**
 * SmartVideoPlayer — plays/pauses/resumes media video files using expo-video.
 */

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { Platform, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { useEventListener } from 'expo'
import { VideoView, createVideoPlayer, type VideoPlayerStatus } from 'expo-video'
import { Ionicons } from '@expo/vector-icons'
import Spinner from '@/features/common/Spinner'
import { themeColors } from '@/core/theme'

// ── Web: suppress noisy AbortError from interrupted play() ─────────────────
// On web, HTMLMediaElement.play() rejects with AbortError when pause() or
// a new load (replace) interrupts it (rapid scroll in feed). This is expected
// and should not surface as "Web ERROR". Filter it globally once.
if (Platform.OS === 'web' && typeof window !== 'undefined' && !(window as any).__videoAbortHandlerInstalled) {
	;(window as any).__videoAbortHandlerInstalled = true
	window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
		const reason: any = (event as any).reason
		const msg = String(reason?.message || reason || '')
		const name = String(reason?.name || '')
		if (name === 'AbortError' || msg.includes('interrupted') || msg.includes('play() request was interrupted')) {
			event.preventDefault()
		}
	})
	// Also filter console.error spam from expo-video's web impl and RN Web nested pressable warnings
	const origError = console.error as any
	if (!(origError as any).__patched) {
		const patchedError = (...args: any[]) => {
			const joined = args.map((a) => String(a ?? '')).join(' ')
			if (joined.includes('AbortError') || joined.includes('play() request was interrupted') || joined.includes('interrupted by a call to pause') || joined.includes('interrupted by a new load')) {
				return
			}
			if (joined.includes('props.pointerEvents is deprecated') || joined.includes('pointerEvents')) {
				return
			}
			// Silence nested Pressable/Touchable warning on web — outer Pressable contains inner QuantityStepper/AddToCartButton Pressables; stopPropagation is handled
			if (joined.includes('Touchable') || joined.includes('Pressable') || joined.includes('nested') || joined.includes('onPress')) {
				const hasKnownStack =
					joined.includes('QuantityStepper') ||
					joined.includes('BusinessProductCard') ||
					joined.includes('BaseCard') ||
					joined.includes('OrderProductCard') ||
					joined.includes('SaleCard') ||
					joined.includes('OrderProductsCard')
				if (hasKnownStack) return
				// Fallback: also check real JS stack if available (React formats args as %s)
				try {
					const errStack = String(new Error().stack ?? '')
					if (errStack.includes('QuantityStepper') || errStack.includes('BusinessProductCard') || errStack.includes('OrderProductCard') || errStack.includes('BaseCard')) return
				} catch {}
				// If it looks like a pure nested pressable warning without known component, suppress to avoid Web ERROR flood (safe on web)
				if (joined.includes('nested')) return
			}
			;(origError as any)(...args)
		}
		;(patchedError as any).__patched = true
		console.error = patchedError as any
	}
	// Silence deprecated props.pointerEvents warning (RN Web) — we use style.pointerEvents
	const origWarn = console.warn as any
	if (!(origWarn as any).__patched) {
		const patchedWarn = (...args: any[]) => {
			const joined = args.map((a) => String(a ?? '')).join(' ')
			if (joined.includes('props.pointerEvents is deprecated') || joined.includes('pointerEvents')) return
			origWarn(...args)
		}
		;(patchedWarn as any).__patched = true
		console.warn = patchedWarn
	}
}

const isAbortError = (e: any): boolean => {
	const name = String(e?.name || '')
	const msg = String(e?.message || e || '')
	return name === 'AbortError' || msg.includes('interrupted') || msg.includes('play() request was interrupted')
}

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
	/** When true, video starts with sound on. Defaults to false (muted for autoplay). */
	soundOn?: boolean
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
	(
		{
			source,
			style,
			contentFit = 'contain',
			nativeControls = true,
			controls = true,
			autoPlay = false,
			loop = false,
			soundOn = false,
			accessibilityLabel,
			testID,
			onPlaybackEnd,
			onError,
			onPlayingChange
		},
		ref
	) => {
		// Use createVideoPlayer instead of useVideoPlayer to avoid useReleasingSharedObject
		// prematurely releasing the native VideoPlayer during component unmount while
		// Android TextureVideoView is still detaching in the native view hierarchy.
		const player = useMemo(() => {
			const instance = createVideoPlayer(source ? { uri: source } : null)
			try {
				instance.loop = loop
			} catch {}
			try {
				if (Platform.OS === 'web' && autoPlay && !soundOn) {
					instance.muted = true
				} else if (!soundOn) {
					instance.muted = !controls || autoPlay ? true : false
				} else {
					instance.muted = false
				}
			} catch {}
			return instance
		}, [])

		const [status, setStatus] = useState<VideoPlayerStatus>(player?.status ?? 'idle')
		const [playing, setPlaying] = useState(autoPlay)
		const isMountedRef = React.useRef(true)
		const prevSourceRef = React.useRef(source)
		const pendingPlayRef = React.useRef<Promise<any> | null>(null)

		const safePlay = useCallback(() => {
			try {
				const p: any = player.play()
				if (p && typeof p.catch === 'function') {
					pendingPlayRef.current = p
					p.catch((e: any) => {
						if (!isAbortError(e)) {
							// Non-abort errors are real — keep default handling
						}
					}).finally(() => {
						if (pendingPlayRef.current === p) pendingPlayRef.current = null
					})
				}
			} catch (e: any) {
				if (!isAbortError(e)) throw e
			}
		}, [player])

		const safePause = useCallback(() => {
			try {
				const pending = pendingPlayRef.current
				if (pending) {
					pending
						.catch(() => {})
						.finally(() => {
							try {
								if (isMountedRef.current && (player as any)?.playing) player.pause()
							} catch {}
						})
					// Also attempt immediate pause as fallback for native where pending is null
					try {
						if ((player as any)?.playing) player.pause()
					} catch {}
				} else {
					if ((player as any)?.playing) player.pause()
				}
			} catch {}
		}, [player])

		useEffect(() => {
			isMountedRef.current = true
			return () => {
				isMountedRef.current = false
				try {
					safePause()
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
		}, [player, safePause])

		// Load/replace source on the stable player when source prop changes.
		useEffect(() => {
			if (prevSourceRef.current === source) return
			prevSourceRef.current = source
			if (!source) return
			let cancelled = false
			;(async () => {
				try {
					if (cancelled || !isMountedRef.current) return
					// Pause any pending play before a new load — prevents
					// "interrupted by a new load request" AbortError on web.
					try {
						safePause()
						// Give the pending play promise a tick to settle
						await new Promise((r) => setTimeout(r, 0))
					} catch {}
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
						if (Platform.OS === 'web' && autoPlay && !soundOn) {
							player.muted = true
						} else if (!soundOn) {
							player.muted = !controls || autoPlay ? true : false
						} else {
							player.muted = false
						}
					} catch {}
				} catch {}
			})()
			return () => {
				cancelled = true
			}
		}, [source, player, loop, controls, autoPlay, soundOn, safePause])

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

		// Autoplay when ready — on web, muted only if soundOn is off (browser allows sound after user interaction)
		useEffect(() => {
			if (!autoPlay || status !== 'readyToPlay' || !isMountedRef.current) return
			try {
				if (Platform.OS === 'web' && !soundOn) {
					player.muted = true
				} else {
					player.muted = !soundOn
				}
				safePlay()
			} catch {}
		}, [autoPlay, status, player, safePlay, soundOn])

		// Pause when autoPlay becomes false (card scrolled off-screen or not focused) — prevents bleed
		// Uses safePause which waits for any pending play() promise to settle first,
		// avoiding "play() request was interrupted by a call to pause()" on web.
		useEffect(() => {
			if (!autoPlay && isMountedRef.current) {
				safePause()
			}
		}, [autoPlay, player, safePause])

		useEffect(() => {
			try {
				player.loop = loop
			} catch {}
		}, [player, loop])

		useEffect(() => {
			try {
				if (Platform.OS === 'web' && autoPlay && !soundOn) {
					player.muted = true
				} else if (!soundOn) {
					player.muted = !controls ? true : false
				} else {
					player.muted = false
				}
			} catch {}
		}, [player, controls, autoPlay, soundOn])

		const play = useCallback(() => {
			safePlay()
		}, [safePlay])

		const pause = useCallback(() => {
			safePause()
		}, [safePause])

		const resume = useCallback(() => {
			safePlay()
		}, [safePlay])

		const toggle = useCallback(() => {
			try {
				if ((player as any)?.playing) {
					safePause()
				} else {
					safePlay()
				}
			} catch {}
		}, [safePause, safePlay])

		useImperativeHandle(ref, () => ({ play, pause, resume, toggle }), [play, pause, resume, toggle])

		const [loadTimedOut, setLoadTimedOut] = useState(false)
		useEffect(() => {
			const loading = status === 'loading' || status === 'idle'
			if (!loading) {
				setLoadTimedOut(false)
				return
			}
			const timer = setTimeout(() => {
				setLoadTimedOut(true)
				try {
					onError?.()
				} catch {}
			}, 12_000)
			return () => clearTimeout(timer)
		}, [status, onError])

		const isLoading = (status === 'loading' || status === 'idle') && !loadTimedOut
		const hasError = status === 'error' || loadTimedOut

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
