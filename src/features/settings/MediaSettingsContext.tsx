import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getItem, setItem } from '@storage'
import { deferStartup } from '@helpers/defer'

export interface MediaSettings {
	autoAdvance: boolean
	autoPlay: boolean
	soundOn: boolean
}

const DEFAULTS: MediaSettings = {
	autoAdvance: true,
	autoPlay: true,
	soundOn: true
}

const STORAGE_KEY = 'mediaSettings'

interface MediaSettingsContextValue extends MediaSettings {
	setAutoAdvance: (v: boolean) => void
	setAutoPlay: (v: boolean) => void
	setSoundOn: (v: boolean) => void
	setSettings: (s: Partial<MediaSettings>) => void
}

const MediaSettingsContext = createContext<MediaSettingsContextValue>({
	...DEFAULTS,
	setAutoAdvance: () => {},
	setAutoPlay: () => {},
	setSoundOn: () => {},
	setSettings: () => {}
})

export const MediaSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [settings, setSettingsState] = useState<MediaSettings>(DEFAULTS)

	useEffect(() => {
		const cancel = deferStartup.critical(() => {
			;(async () => {
				const stored = await getItem<MediaSettings>(STORAGE_KEY)
				if (stored && typeof stored === 'object') {
					setSettingsState({
						autoAdvance: typeof stored.autoAdvance === 'boolean' ? stored.autoAdvance : DEFAULTS.autoAdvance,
						autoPlay: typeof stored.autoPlay === 'boolean' ? stored.autoPlay : DEFAULTS.autoPlay,
						soundOn: typeof stored.soundOn === 'boolean' ? stored.soundOn : DEFAULTS.soundOn
					})
				}
			})()
		})
		return cancel
	}, [])

	const persist = useCallback(async (next: MediaSettings) => {
		setSettingsState(next)
		await setItem(STORAGE_KEY, next)
	}, [])

	const setAutoAdvance = useCallback(
		(v: boolean) => {
			const next = { ...settings, autoAdvance: v }
			persist(next)
		},
		[settings, persist]
	)
	const setAutoPlay = useCallback(
		(v: boolean) => {
			const next = { ...settings, autoPlay: v }
			persist(next)
		},
		[settings, persist]
	)
	const setSoundOn = useCallback(
		(v: boolean) => {
			const next = { ...settings, soundOn: v }
			persist(next)
		},
		[settings, persist]
	)
	const setSettings = useCallback(
		(s: Partial<MediaSettings>) => {
			const next = { ...settings, ...s }
			persist(next)
		},
		[settings, persist]
	)

	return <MediaSettingsContext.Provider value={{ ...settings, setAutoAdvance, setAutoPlay, setSoundOn, setSettings }}>{children}</MediaSettingsContext.Provider>
}

export const useMediaSettings = () => useContext(MediaSettingsContext)
export default MediaSettingsContext
