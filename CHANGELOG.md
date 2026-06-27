# Changelog

## [1.26.9] - 27 june 2026
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

