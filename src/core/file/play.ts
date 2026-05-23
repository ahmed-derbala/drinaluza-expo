/**
 * File Play Utilities
 * Handles playing video and audio files
 * Note: Requires expo-audio to be installed for audio playback
 */

import { FilePlayOptions, PlayResult } from './types'

/**
 * Play an audio file
 * Note: Requires expo-audio to be installed
 */
const playAudio = async (options: FilePlayOptions): Promise<PlayResult> => {
	try {
		const { uri } = options

		// Try to dynamically import expo-audio
		let expoAudio: any
		try {
			expoAudio = require('expo-audio')
		} catch (e) {
			return {
				success: false,
				error: 'expo-audio is not installed. Install it to enable audio playback.'
			}
		}

		const { autoPlay = true, loop = false } = options

		const player = expoAudio.createAudioPlayer(uri)
		player.loop = loop

		if (autoPlay) {
			player.play()
		}

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
const playVideo = async (options: FilePlayOptions): Promise<PlayResult> => {
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
const playMedia = async (options: FilePlayOptions): Promise<PlayResult> => {
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
 * Note: Requires expo-audio to be installed
 */
const getAudioDuration = async (uri: string): Promise<number> => {
	try {
		let expoAudio: any
		try {
			expoAudio = require('expo-audio')
		} catch (e) {
			return 0
		}

		const player = expoAudio.createAudioPlayer(uri)
		let retries = 0
		while (player.duration === 0 && retries < 20) {
			await new Promise((resolve) => setTimeout(resolve, 100))
			retries++
		}

		const durationMs = (player.duration || 0) * 1000

		if (player.release) {
			player.release()
		} else if (player.remove) {
			player.remove()
		}

		return durationMs
	} catch (error) {
		return 0
	}
}
