# Changelog

## [1.10.1] - 2026-05-28
### Added
- Integrated free device storage space display dynamically inside the Update Available, Update Required, Update Ready, and Multiple Updates (Dual Update) modal overlays.
- Added localized translations for the new "Free Storage" status across English, Arabic, French, Tunisian Latin, and Tunisian Arabic locales.

## [1.8.0] - 2026-05-28
### Added
- Completely removed all name query parameters (`?name=...`) from navigation routes across the codebase to adhere to clean routing and official `expo-router` best practices.
- Configured the product and business detail screens to gracefully display a localized loading state in their headers while fetching data from the API.
- Configured the Home Layout to hide the dashboard bottom tab bar icon unless there is an authenticated user whose role matches 'business_owner' (the database equivalent for business owners) to prevent unauthorized views.

### Fixed
- Missing version string in the Required Minimum version chip inside the blocking Required Update modal.
- A minor script syntax merging issue in package.json.
- Navigation Error Boundary crash on startup due to conflicting `href` and `tabBarButton` options inside the Home Layout tabs configuration.

## [1.7.6] - 2026-05-28
### Added
- Configured the share icon next to each cached update item row in the Settings Update Center to show the Quick Share advisory instructions dialog and launch the system sharing sheet upon confirmation.

## [1.4.1] - 2026-05-27
### Added
- Automatic promptless installer launch for required update packages on startup when the file exists in the cache folder.
- Dynamic check and trigger for immediate installation of ready-to-install required update packages during updates transition checks.

### Fixed
- Redundant confirmation prompt displays when a mandatory update's package has already been successfully downloaded.

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
