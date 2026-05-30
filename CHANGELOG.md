# Changelog

## [1.17.1] - 2026-05-30
### Added
- Re-created a premium, cross-platform `AppUpdater` suite under `src/core/app-updater/` coordinating startup checks, downloads, installations, disk storage queries, and cache cleans.
- Integrated a solid black `#000000` **Startup Gate** screen inside `src/app/_layout.tsx` to handle parallel checks and completely eliminate startup flickering or navigation race conditions.
- Added an "App Updates" control panel in `SettingsScreen.tsx` with checking controls, versions display, cached files tracking, and system sharing wrappers.
- Integrated download progress scaling dynamically in `SmartScreenHeader` right-action button during optional updates.

### Changed
- Refactored the API client in `src/core/api/index.ts` to import the centralized `config` namespace and use `config.TIMEOUT_MS` for its request timeout instead of legacy named exports.
- Capped Socket.io client reconnection attempts to `RETRY_ATTEMPTS` (3) instead of 10 and implemented a robust `reconnect_failed` handler to disconnect and release connection resources when the backend server is unreachable.

## [1.16.9] - 2026-05-29
### Added
- Created a highly premium, reusable, and type-safe screen header component named `SmartScreenHeader` supporting Android, iOS, and Web under `src/core/smart-screen-header/`.
- Exported modular sub-components `SmartScreenHeader.BackButton` and `SmartScreenHeader.Action` to enable flexible and clean composition layouts without hardcoding icons inside screens.
- Added a premium loop-animated linear loading bar running along the bottom border of the header using native-driver scaling, preventing layout shifts.
- Implemented mathematically centered title/subtitle alignments that truncate gracefully and prevent overlapping with left/right actions.
- Integrated `useSafeAreaInsets` to provide precise status bar top padding adjustments.
- Added Web-native focus outline rings for keyboard accessibility navigation and background overlays on hover.
- Replaced the legacy header in `SettingsScreen.tsx` with a custom `SmartScreenHeader` composition rendering, complete with a refresh action and loading progress bar synchronization.
- Mounted global status bar styling (`<StatusBar style="light" />`) at the root layout of the application.

### Changed
- Removed the light theme entirely from the codebase by mapping lightColors directly to darkColors in `colors.ts` and locking `isDark = true` / `theme = DarkTheme` inside `AppThemeProvider`.
- Completely removed the Appearance theme toggle menu section from `SettingsScreen.tsx` to streamline the Strictly Dark Mode experience.

### Fixed
- Fixed a white flash on screen transitions when navigating back or pushing routes (like returning to `/feed` from details) by hardcoding the stack navigator `contentStyle`, tab `sceneContainerStyle`, and screen wrappers directly to `#000000` (black) and styling stack headers to `#1C2541` natively across layout stacks. Enforced native dark mode configuration (`userInterfaceStyle: "dark"`, `backgroundColor: "#000000"`) by default across platforms in `app.config.js`.

## [1.16.1] - 2026-05-29
### Added
- Completely rewrote `KeyboardSafeView` and `KeyboardSafeFlatList` from scratch as highly robust, cross-platform, layout-aware containers.
- Integrated automatic scroll-to-focused-input automation leveraging standard host measurements relative to viewport wrapping containers on Native and Web.
- Added configurable `bottomOffset` and `dismissKeyboardOnTap` properties to customize padding and background tap dismiss behavior.
- Supported seamless landscape and portrait orientation transitions with automatic layout recalculation when keyboard height changes.
- Completely rewrote the authentication route (`/auth`) from scratch to provide a stunning premium-tier interface with advanced saved accounts lists, flag selector buttons, strict validation sanitizers, custom checkbox components, and complete storage destruction buttons.

### Fixed
- Fixed layout overlap, flickering, and jumps when virtual keyboards are triggered inside nested navigators, modals, and tab views across Android and iOS.

## [1.15.0] - 2026-05-29
### Added
- Created a reusable `KeyboardSafeView` layout component under `src/core/KeyboardSafeView/` to handle keyboard-aware scroll container layouts cross-platform.
- Added `softwareKeyboardLayoutMode: "resize"` configuration in `app.config.js` to ensure the Android window viewport scales properly when the virtual keyboard is open.
- Added strict pre-flight HEAD checks to validate `.apk` extension, MIME type, and remote file size before starting update package downloads.
- Integrated a transactional download buffer (`.apk.tmp`) to ensure cached updates are never overwritten during active download sessions.
- Added localized translations for the `redownload_update` recovery label across English, Arabic, French, Tunisian Arabic, and Tunisian Latin dictionaries.

### Fixed
- Fixed an infinite update installation loop on Android by replacing automatic programmatic installer triggers with user-facing modal confirmations.
- Fixed a corrupted update recovery issue by providing manual "Install Now" and "Delete & Re-download" action handlers on the Required Update blocked screen.
- Fixed a background transition error where deliberate download pauses played the `notification.mp3` error sound and triggered the browser fallback.
- Removed legacy `DownloadResumable` resume logic to prevent failures caused by GitHub redirect structures.

## [1.12.0] - 2026-05-28
### Added
- Added Arabic (`ar`) and French (`fr`) as officially supported options inside the global `LANGUAGES` configuration array.
- Enabled native language selection for Arabic and French across the authentication dropdown selectors, settings menus, profile details screens, and localization contexts.

## [1.11.0] - 2026-05-28
### Added
- Implemented robust resumable download capability for update packages. Download resume data is saved persistently in `AsyncStorage` when a download is interrupted or paused.
- Integrated automatic AppState background/foreground synchronization:
  - When the app is switched or goes to the background, any active update download is automatically paused and its progress is securely saved.
  - When the app returns to the foreground, the paused download automatically resumes from the exact percentage where it was left.
- Added self-healing capability that falls back to starting a fresh download if the saved resume data is corrupted or outdated.
- Solved the Android package parser error ("there was a problem parsing the package") caused by corrupted or partial APK files after app switching.

## [1.10.6] - 2026-05-28
### Added
- Configured dynamic startup check workflows:
  - If a ready-to-install update exists alongside a newer optional download, prompt the user to download the latest version or install the ready one.
  - If a ready-to-install update exists alongside a newer required download, display a blocking modal asking the user to download the latest version or exit the application.
  - If a ready-to-install update exists with no newer download version available, launch the installer automatically on startup without requiring user confirmation.
- Integrated rich GitHub release metadata details into the update modals, displaying the release name, published date (beautifully parsed and localized), download file size, and total download count.
- Localized the new metadata labels and dual required message strings across English, French, Arabic, Tunisian Latin, and Tunisian Arabic.

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
