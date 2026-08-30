import { Platform, InteractionManager } from 'react-native'

/**
 * Defer a task until after the initial render / idle period.
 * Priority is to let the home feed (cached data) paint first;
 * everything else (auth, updates, sockets, cleanup) runs later.
 *
 * - Web: uses requestIdleCallback when available
 * - Native: waits for interactions to finish, then setTimeout
 *
 * Returns a cancel function.
 */
export function deferTask(callback: () => void | Promise<void>, options?: { delay?: number; timeout?: number }): () => void {
	const delay = options?.delay ?? 1500
	const timeout = options?.timeout ?? delay + 500

	// Web idle callback — ideal for deferring until main thread is free
	if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof (window as any).requestIdleCallback === 'function') {
		const id = (window as any).requestIdleCallback(
			() => {
				callback()
			},
			{ timeout }
		)
		return () => {
			try {
				;(window as any).cancelIdleCallback(id)
			} catch {}
		}
	}

	// Native: run after interactions + extra delay
	let timeoutId: ReturnType<typeof setTimeout> | null = null
	let interactionHandle: { cancel?: () => void } | null = null
	let cancelled = false

	const run = () => {
		if (cancelled) return
		timeoutId = setTimeout(() => {
			if (!cancelled) callback()
		}, delay)
	}

	try {
		// InteractionManager exists on native and web (no-op on web)
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		if (InteractionManager && typeof InteractionManager.runAfterInteractions === 'function') {
			interactionHandle = InteractionManager.runAfterInteractions(run)
		} else {
			run()
		}
	} catch {
		timeoutId = setTimeout(callback, delay)
	}

	return () => {
		cancelled = true
		if (interactionHandle && typeof interactionHandle.cancel === 'function') {
			try {
				interactionHandle.cancel()
			} catch {}
		}
		if (timeoutId) clearTimeout(timeoutId)
	}
}

// ─── Feed-ready gate ────────────────────────────────────────────────────────
// Deferred startup tasks should run *after the feed has actually painted*
// from cache, not just after a fixed timer. This keeps the critical path
// (AsyncStorage read of `feed:page1:*`) uncontended. If the user never
// visits feed (e.g. deep-link to /auth), tasks still run after a fallback
// timeout so nothing stalls indefinitely.
let feedReady = false
const feedReadyListeners = new Set<() => void>()

export const markFeedReady = (): void => {
	if (feedReady) return
	feedReady = true
	feedReadyListeners.forEach((cb) => {
		try {
			cb()
		} catch {}
	})
	feedReadyListeners.clear()
}

export const isFeedReady = (): boolean => feedReady

/**
 * Defer until the feed has painted (cache read → `isInitialLoading:false`).
 * Falls back to running after `maxWaitMs` even if feed never mounts.
 * After the gate opens, still yields to idle via `deferTask` so the frame
 * that painted the feed is not janked.
 */
export function deferAfterFeedReady(callback: () => void | Promise<void>, options?: { delay?: number; timeout?: number; maxWaitMs?: number }): () => void {
	const delay = options?.delay ?? 400
	const timeout = options?.timeout ?? 2000
	const maxWaitMs = options?.maxWaitMs ?? 3000

	if (feedReady) {
		return deferTask(callback, { delay, timeout })
	}

	let cancelled = false
	let fallbackId: ReturnType<typeof setTimeout> | null = null

	const run = () => {
		if (cancelled) return
		deferTask(callback, { delay, timeout })
	}

	const listener = () => {
		if (cancelled) return
		if (fallbackId) clearTimeout(fallbackId)
		feedReadyListeners.delete(listener)
		run()
	}

	feedReadyListeners.add(listener)

	fallbackId = setTimeout(() => {
		feedReadyListeners.delete(listener)
		if (!cancelled) run()
	}, maxWaitMs)

	return () => {
		cancelled = true
		if (fallbackId) clearTimeout(fallbackId)
		feedReadyListeners.delete(listener)
	}
}

/**
 * Shorthand: defer with default delays tuned for startup phases.
 * Previously time-based; now feed-gated with the same idle delays.
 * - critical: ~400ms after feed paint (guest settings, user)
 * - normal: ~600ms after feed paint (sockets, backend connection)
 * - low: ~800ms after feed paint (updates check, FS cleanup, video cache)
 * Each has a 3000ms maxWait so tasks still run on non-feed entry routes.
 */
export const deferStartup = {
	critical: (cb: () => void | Promise<void>) => deferAfterFeedReady(cb, { delay: 400, timeout: 2000, maxWaitMs: 3000 }),
	normal: (cb: () => void | Promise<void>) => deferAfterFeedReady(cb, { delay: 600, timeout: 3000, maxWaitMs: 3500 }),
	low: (cb: () => void | Promise<void>) => deferAfterFeedReady(cb, { delay: 800, timeout: 5000, maxWaitMs: 4000 })
}

/**
 * Legacy time-based defer (no feed gate). Use only for work that must
 * run even before feed, or for tests. Prefer `deferStartup`/`deferAfterFeedReady`.
 */
export const deferIdle = deferTask
