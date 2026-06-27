# Changelog

## [1.27.5] - 27 june 2026
### Removed
- Completely remove isStartupChecking state, comments, and the black splash screen loader rendering gate from root `_layout.tsx`.

## [1.27.4] - 27 june 2026
### Changed
- Optimize Android startup performance by making update check non-blocking and running it asynchronously in the background.

## [1.27.3] - 27 june 2026
### Fixed
- Fix application crash on the Web platform inside `ContactButtons` and `UserCard` by correcting `hitSlop` format from number to object.
- Fix deprecated `textShadow*` stylesheet property warnings on Web inside `ProductCard` styles.

## [1.27.2] - 27 june 2026
### Added
- Add a Cancel button during active download progress on the Updates screen.
- Retain incomplete download `.tmp` files on app startup by skipping their deletion inside `performStartupCleanup()`.
- Persist download resume data locally in Storage so downloads can survive application restarts.

## [1.27.1] - 27 june 2026
### Changed
- Filter out default menu items (Home, Settings, About, Updates) in `SmartKebabMenu` if they match the currently active route path/screen.

## [1.26.15] - 27 june 2026
### Added
- Add pause, resume, and cancel download controls to Updates screen layout.
- Implement `pauseDownload`, `resumeDownload`, and `cancelDownload` callback logic inside `UpdatesContext.tsx` to handle partial download resume files dynamically.

## [1.26.14] - 27 june 2026
### Added
- Create SearchScreen with search input, 1-second query debounce, collapsible filters (products and users scopes), and search history persistence.
- Create dedicated `search.api.ts` module with GET `/search` API call matching scopes parameters.
- Append translation strings to `en.ts` translations file.

## [1.26.13] - 27 june 2026
### Added
- Redesign and implement the Search feature completely from scratch using clean, decoupled modular components and hooks.
- Create `useSearch.ts` custom hook to extract state, API search queries, debouncing logic, history CRUD, and parameter synchronizations.
- Extract `SearchBar.tsx`, `SearchFilters.tsx`, `SearchHistory.tsx`, `SearchResults.tsx`, and `SkeletonCard.tsx` as standalone components.
- Delete the legacy unused `SearchBar.tsx` component.

### Changed
- Re-wire `SearchScreen.tsx` to serve as a clean UI shell coordinating subcomponents and loading user cart state.

## [1.26.12] - 27 june 2026
### Added
- Add shimmer skeleton loading cards to search screen (matching FeedScreen style) instead of a bare activity spinner.
- Add result count badge displayed below filter chips when search results are present.
- Add `RefreshControl` (pull-to-refresh) to search results lists on both mobile and web.
- Add `keyboardDismissMode="on-drag"` to all scroll views in search screen for better keyboard UX.
- Add `useScrollHandler` to search results FlashList so the header hides on scroll down and restores on scroll up.
- Add accessibility roles and labels on search history items.

### Changed
- Reduce search debounce delay from 400ms to 350ms for snappier feel.
- Move history rendering into a dedicated `ScrollView`-wrapped section, making it scrollable when the list is long.
- Refactor mount-only `useEffect` to use an empty dependency array with a ref guard to prevent re-runs caused by stale closure deps.
- Add `estimatedItemSize={260}` to results `FlashList` for improved scroll performance.
- Wire history item taps to only fire a search if the search bar text has actually changed.

### Fixed
- Fix stale `last_search_text` restoration: storage is now only applied on clean mounts with no URL `q=` param, and never restores an empty string.
- Replace all `console.error`/`console.warn` calls in search screen with the project's `log()` utility.
- Fix `addToCart`, `loadCart`, `renderEmpty`, and `renderHistorySection` not being memoized with `useCallback`, causing unnecessary re-renders.
- Remove dead `loadHistory` callback that was defined but never called.

## [1.26.11] - 27 june 2026
### Added
- Add reusable `KeyboardAvoidingWrapper` component under `src/core/keyboard-avoiding-wrapper/` to prevent the on-screen keyboard from obscuring input fields.
- Add `sync-screenshots.js` script and placeholder comment tags in `README.md` to automatically scan `docs/screenshots/` and update screenshot image layouts during start, dev, and release builds.

### Changed
- Replace inline `KeyboardAvoidingView` + `ScrollView` pair in `AuthScreen` with the new shared `KeyboardAvoidingWrapper`.
- Rename `SmartScreenHeader` to `SmartHeader` (and its directory `src/core/smart-screen-header/` to `src/core/smart-header/`) and update all 10 consumers.
- Add global `isHeaderVisible` state to `LayoutContext` and update `useScrollHandler` to hide the header on scroll down and restore it on scroll up.
- Decrease scroll-up sensitivity for header visibility by accumulating scroll direction changes and setting a custom 150px threshold.
- Fix scroll flickering during continuous long scrolls by ignoring scroll events in the 400ms transition quiet window after a visibility toggle.
- Update `SmartHeader` layout and opacity animation using `Animated` to collapse its height and slide out of view cleanly when hidden.
- Replace search screen custom back/input header with standard SmartHeader component, positioning the search bar below it and adding correct top padding offset to prevent overlapping.
- Fix SmartKebabMenu clipping bug by toggling SmartHeader container overflow style to visible when the header is active.
- Resolve duplicate API requests on search screen by tracking locally-initiated input and filter changes.
- Implement flex-wrap grid container layout on Web version of search screen to prevent cards overlapping.
- Persist the last searched text query using local storage and restore it on mount when no URL parameters exist, and clear the persisted value when clearing history or inputs.
- Fix search character delete bug by wrapping initial auto-search mount effects in a single-execution ref guard.

