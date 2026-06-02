# Changelog

## [Unreleased]

### Changed
- Modified `SmartScreenHeader` to ensure the back button is always visible in `headerLeft` and defaults to `/feed` when there is no screen in history.
- Modified `SmartScreenHeader` to show "Loading..." as the title while a screen is loading, and hide the subtitle during this state.
- Modified `UpdatesContext` to keep all downloaded APK files in local storage by disabling the automatic pruning of older version files, allowing users to view and manage all cached files.
- Modified the `/updates` page to show the cached APK installers list on all platforms when files exist, rather than restricting it to Android.

### Added
- Added `loading` translation key to local translation files (`en`, `fr`, `ar`, `tn_latn`, `tn_arab`).

## [1.23.3] - 2026-06-02

### Added
- Created a reusable `SmartScreenHeader` component that supports responsive layouts, safe area top insets, and customizable header actions.
- Introduced pre-configured composed action buttons (`BackButton`, `NotificationsButton`, `SearchButton`, `CartButton`, `SettingsButton`) as static sub-components of `SmartScreenHeader`.
- Added a premium linear progress loading indicator to `SmartScreenHeader` utilizing performant `Animated` transforms.
- Enhanced `SmartScreenHeader` to be fully compatible with React Navigation custom header specifications (`options`, `route`, `navigation`, `back`).

### Changed
- Configured `SmartScreenHeader` as the default custom `header` renderer across root navigation files (tabs layout, businesses layout, products layout, users layout, and dashboard layout), ensuring the kebab menu is rendered on every screen.
- Refactored `AuthScreen` to utilize the new unified `SmartScreenHeader` component, reducing code duplication and manual inset calculations.
- Refactored the updates screen to utilize `SmartScreenHeader` and tied the checking/downloading states to the loading progress bar.
- Refactored `performStartupCheck` in the root layout to verify the fresh local APK lists, correctly installing ready downloaded APKs (which are higher than the current version) if the current version is equal or higher than the latest version, while maintaining app entry on check failure or web startup.

## [1.18.0] - 2026-06-02

### Added
- Rewrote the Authentication Screen (`/auth`) from scratch using the premium `SmartScreenHeader`, registering a dynamic "Reset App" action inside the `SmartKebabMenu`, and maintaining complete `KeyboardSafeView` scroll containment.
- Integrated page reload automation via `window.location.reload()` into the web updates screen refresh button, ensuring exact disabled-state conditional comparisons.
- Implemented smart badge toggle checks inside `SmartKebabMenu` that hide the updates badge unless a remote update is downloadable or a cached APK is installable.
