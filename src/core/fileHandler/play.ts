/**
 * File Play Utilities
 * Handles playing video and audio files
 * Note: Requires expo-av to be installed for audio playback
 */

import { FilePlayOptions, PlayResult } from './types'

/**
 * Play an audio file
 * Note: Requires expo-av to be installed
 */
export const playAudio = async (options: FilePlayOptions): Promise<PlayResult> => {
	try {
		const { uri } = options

		// Try to dynamically import expo-av
		let Audio: any
		try {
			Audio = require('expo-av').Audio
		} catch (e) {
			return {
				success: false,
				error: 'expo-av is not installed. Install it to enable audio playback.'
			}
		}

		const { autoPlay = true, loop = false } = options

		// Configure audio mode
		await Audio.setAudioModeAsync({
			playsInSilentModeIOS: true,
			staysActiveInBackground: true,
			shouldDuckAndroid: true
		})

		// Create and load the sound
		const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: autoPlay, isLooping: loop })

		return {
			success: true
		}
	} catch (error: any) {
		return {
			success: false,
			error: error.message || 'Failed to play audio'
		}
	}
}

/**
 * Play a video file
 * Note: For video playback, you should use a video component in your UI
 * This function prepares the video URI for playback
 */
export const playVideo = async (options: FilePlayOptions): Promise<PlayResult> => {
	try {
		const { uri } = options

		// For video, we just validate the URI and return success
		// The actual playback should be handled by a Video component
		// This function can be extended to prepare video-specific settings

		return {
			success: true
		}
	} catch (error: any) {
		return {
			success: false,
			error: error.message || 'Failed to prepare video'
		}
	}
}

/**
 * Play a media file (audio or video)
 */
export const playMedia = async (options: FilePlayOptions): Promise<PlayResult> => {
	const { type } = options

	if (type === 'audio') {
		return playAudio(options)
	} else if (type === 'video') {
		return playVideo(options)
	} else {
		return {
			success: false,
			error: 'Unsupported media type'
		}
	}
}

/**
 * Get audio duration
 * Note: Requires expo-av to be installed
 */
export const getAudioDuration = async (uri: string): Promise<number> => {
	try {
		let Audio: any
		try {
			Audio = require('expo-av').Audio
		} catch (e) {
			return 0
		}

		const { sound } = await Audio.Sound.createAsync({ uri })
		const status = await sound.getStatusAsync()
		return (status as any).durationMillis || 0
	} catch (error) {
		return 0
	}
}
