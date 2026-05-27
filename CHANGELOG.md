# Changelog

All notable changes to this project will be documented in this file.

## [1.3.81] - 2026-05-27
### Added
- Mapped software update checks strictly via the `EXPO_PUBLIC_UPDATE_CHECK_URL` environment configuration parameter.
- Routed background update package downloads, browser fallbacks, and sharing URLs dynamically via the `EXPO_PUBLIC_UPDATE_DOWNLOAD_ROOT_URL` environment configuration parameter.
- Integrated a premium **Unified Update Options Modal** overlay that automatically triggers on app startup when a downloaded update is cached locally AND a newer update version is available on the remote server, preventing overlapping/stacked modals.
- Provided localized interactive buttons inside the unified modal: **Install Ready (v{version})** (emerald button), **Download New (v{version})** (primary button), and **Later** (neutral button).
- Added a visual card-based **Cached Update Files** list inside the Settings Update Center on Android displaying downloaded update APK files with file size conversions (e.g. `15.42 MB`).
- Integrated a programmatic **delete/trash button** into each cached update item row, with full state synchronization that automatically clears ready-to-install indicators if the deleted package matches the active installer.
- Added a **direct share button** next to each cached update item row, allowing users to share specific cached APK versions via Bluetooth, Bluetooth Quick Share, or other applications.

### Fixed
- Modal stacking conflict when both local update cache and remote update notifications trigger on startup.
- Full context synchronization when cached ready update APK files are deleted.
