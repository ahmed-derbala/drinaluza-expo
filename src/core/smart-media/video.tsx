/**
 * SmartVideoPlayer — plays/pauses/resumes media video files using expo-video.
 */

import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react'
import { StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { useEventListener } from 'expo'
import { VideoView, useVideoPlayer, type VideoPlayerStatus } from 'expo-video'
import { Ionicons } from '@expo/vector-icons'
import Spinner from '@/features/common/Spinner'
import { themeColors } from '@/core/theme'

export type VideoContentFit = 'contain' | 'cover' | 'fill'

export interface SmartVideoPlayerProps {
	source: string
	style?: StyleProp<ViewStyle>
	contentFit?: VideoContentFit
	/** Whether to use the native platform controls. Defaults to true. */
	nativeControls?: boolean
	/** Start playback automatically once ready. Defaults to false. */
	autoPlay?: boolean
	/** Loop the video. Defaults to false. */
	loop?: boolean
	accessibilityLabel?: string
	testID?: string
}

export interface SmartVideoPlayerHandle {
	play: () => void
	pause: () => void
	resume: () => void
	toggle: () => void
}

const PlaybackButton = ({ playing, onPress }: { playing: boolean; onPress: () => void }) => (
	<TouchableOpacity onPress={onPress} style={styles.playbackButton} accessibilityRole="button" accessibilityLabel={playing ? 'Pause video' : 'Play video'}>
		<Ionicons name={playing ? 'pause' : 'play'} size={28} color={themeColors.buttonText} />
	</TouchableOpacity>
)

const SmartVideoPlayerComponent = forwardRef<SmartVideoPlayerHandle, SmartVideoPlayerProps>(
	({ source, style, contentFit = 'contain', nativeControls = true, autoPlay = false, loop = false, accessibilityLabel, testID }, ref) => {
		const player = useVideoPlayer(source, (instance) => {
			instance.loop = loop
		})

		const [status, setStatus] = useState<VideoPlayerStatus>(player.status ?? 'idle')
		const [playing, setPlaying] = useState(autoPlay)

		useEventListener(player, 'statusChange', ({ status: nextStatus }) => {
			setStatus(nextStatus)
		})

		useEventListener(player, 'playingChange', ({ isPlaying }) => {
			setPlaying(isPlaying)
		})

		const play = useCallback(() => {
			player.play()
		}, [player])

		const pause = useCallback(() => {
			player.pause()
		}, [player])

		const resume = useCallback(() => {
			player.play()
		}, [player])

		const toggle = useCallback(() => {
			if (player.playing) {
				player.pause()
			} else {
				player.play()
			}
		}, [player])

		useImperativeHandle(ref, () => ({ play, pause, resume, toggle }), [play, pause, resume, toggle])

		const isLoading = status === 'loading' || status === 'idle'
		const hasError = status === 'error'

		const playbackOverlay = useMemo(() => {
			if (nativeControls || hasError) return null
			return (
				<View style={[styles.overlay, { pointerEvents: 'box-none' }]}>
					<PlaybackButton playing={playing} onPress={toggle} />
				</View>
			)
		}, [nativeControls, hasError, playing, toggle])

		if (hasError) {
			return (
				<View style={[styles.container, style]}>
					<Ionicons name="videocam-off-outline" size={32} color={themeColors.textTertiary} />
				</View>
			)
		}

		return (
			<View style={[styles.container, style]} testID={testID} accessibilityLabel={accessibilityLabel}>
				<VideoView player={player} style={StyleSheet.absoluteFill} contentFit={contentFit} nativeControls={nativeControls} allowsPictureInPicture={false} />
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
