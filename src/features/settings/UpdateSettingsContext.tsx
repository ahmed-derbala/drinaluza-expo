import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getItem, setItem } from '@storage'
import { deferStartup } from '@helpers/defer'

export interface UpdateSettings {
	enabled: boolean
	maxApkKeepCount: number
}

const DEFAULTS: UpdateSettings = {
	enabled: true,
	maxApkKeepCount: 2
}

const STORAGE_KEY = 'updateSettings'

interface UpdateSettingsContextValue extends UpdateSettings {
	loading: boolean
	setEnabled: (v: boolean) => void
	setMaxApkKeepCount: (v: number) => void
	setSettings: (s: Partial<UpdateSettings>) => void
}

const UpdateSettingsContext = createContext<UpdateSettingsContextValue>({
	...DEFAULTS,
	loading: true,
	setEnabled: () => {},
	setMaxApkKeepCount: () => {},
	setSettings: () => {}
})

export const UpdateSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [settings, setSettingsState] = useState<UpdateSettings>(DEFAULTS)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const cancel = deferStartup.critical(() => {
			;(async () => {
				const stored = await getItem<UpdateSettings>(STORAGE_KEY)
				if (stored && typeof stored === 'object') {
					setSettingsState({
						enabled: typeof stored.enabled === 'boolean' ? stored.enabled : DEFAULTS.enabled,
						maxApkKeepCount: typeof stored.maxApkKeepCount === 'number' ? Math.min(5, Math.max(1, stored.maxApkKeepCount)) : DEFAULTS.maxApkKeepCount
					})
				}
				setLoading(false)
			})()
		})
		return cancel
	}, [])

	const persist = useCallback(async (next: UpdateSettings) => {
		setSettingsState(next)
		await setItem(STORAGE_KEY, next)
	}, [])

	const setEnabled = useCallback(
		(v: boolean) => {
			const next = { ...settings, enabled: v }
			persist(next)
		},
		[settings, persist]
	)

	const setMaxApkKeepCount = useCallback(
		(v: number) => {
			const next = { ...settings, maxApkKeepCount: Math.min(5, Math.max(1, v)) }
			persist(next)
		},
		[settings, persist]
	)

	const setSettings = useCallback(
		(s: Partial<UpdateSettings>) => {
			const next = { ...settings, ...s }
			if (typeof s.maxApkKeepCount === 'number') {
				next.maxApkKeepCount = Math.min(5, Math.max(1, s.maxApkKeepCount))
			}
			persist(next)
		},
		[settings, persist]
	)

	return <UpdateSettingsContext.Provider value={{ ...settings, loading, setEnabled, setMaxApkKeepCount, setSettings }}>{children}</UpdateSettingsContext.Provider>
}

export const useUpdateSettings = () => useContext(UpdateSettingsContext)
export default UpdateSettingsContext
