# Changelog

## [Unreleased]

### Added
- Implemented business contact action buttons (Call, WhatsApp, Email, Directions) inside product cards in the feed, enabling direct messaging and navigation access to a product's business.
- Added a client-side contact details enrichment engine on the feed screen to dynamically resolve missing business contact fields on product cards from other loaded cards or via lazy background fetching.

### Removed
- Uninstalled unused `react-native-keyboard-aware-scroll-view` dependency from `package.json`.
- Removed deprecated `estimatedItemSize` props from all `FlashList` components, aligning with `@shopify/flash-list` version `2.0.2` New Architecture layout capabilities.
- Completely removed the custom `SmartKeyboardSafeView` component and refactored all usages across the app to use standard React Native `ScrollView` and `KeyboardAvoidingView` components.
- Removed custom `StatusBar` imports and rendering from layouts, disabling app-level alterations to the device's default status bar.
- Removed unused `@react-navigation/native` and `@react-navigation/native-stack` packages from dependencies.

### Changed
- Migrated high-volume list screens (`FeedScreen`, `SalesScreen`, `PurchasesScreen`, `SearchScreen`, `ProductsListScreen`, and `BusinessesListScreen`) from `FlatList` to Fabric-compatible `FlashList` for optimized memory and scroll performance.
- Refactored `FeedScreen`, `SearchScreen`, `PurchasesScreen`, `BusinessProductsScreen`, `ProductDetailScreen`, `ProfileScreen`, and `UserContext` to use custom storage module helpers (`getItem`, `setItem`) instead of importing `@react-native-async-storage/async-storage` directly, complying with codebase architectural data persistence rules.
- Memoized `FeedCard` and `SaleCard` components using `React.memo` to prevent redundant item re-renders during list scrolls and parent state updates.
- Streamlined network fetching by resolving duplicate API calls on mount and tab switches in `SalesScreen` and `PurchasesScreen`.
- Migrated Theme/styling imports from `@react-navigation/native` to the standard `expo-router/react-navigation` library using official Expo SDK 56 codemods.
- Improved `/auth` keyboard avoidance: focusing on username (slug) or password fields automatically scrolls the credentials form to the bottom to ensure the continue button is clearly visible and not obscured by the on-screen keyboard.
- Improved centralized storage module `src/core/storage/` by adding generic storage helpers (`getItem`, `setItem`, `removeItem`, `multiRemove`, `getAllKeys`), a complete `clearAllStorage` function (clearing AsyncStorage, web storages, and all known SecureStore keys), and `clearStorageExceptSavedAuths` helper.
- Refactored `/auth` screen and auth API to use the improved storage module instead of importing and using `@react-native-async-storage/async-storage` directly, ensuring full compliance with the codebase persistence architectural rules.
- Added a `disableAnimations` prop to `SmartScreenHeader` and enabled it on the `/updates` screen to remove all header animations (linear progress bar, pulsing skeleton loaders, and title fade-in).
- Refactored form and details screens (including `/auth`, `/profile`, `/businesses/[slug]`, `/businesses/[slug]/edit`, `/products/create`, `/businesses/[slug]/products/[slug]`, and `/businesses/[slug]/products/[slug]/edit`) to use `SmartKeyboardSafeView` to prevent keyboard overlap on input fields across platforms.
- Refactored `/search` and business products lists to use standard React Native `FlatList` components.
- Modified `SmartScreenHeader` to ensure the back button is always visible in `headerLeft` (defaulting to `/feed` when there is no screen in history) on all non-root screens, while keeping it hidden on main root tab screens by checking the router's current `pathname` (following Expo Router best practices).

### Fixed
- Resolved React Navigation theme type augmentation errors under Expo Router SDK 56 and fixed typing issues with `StyleSheet.absoluteFillObject` by adopting `StyleSheet.absoluteFill`.
- Fixed asynchronous state layout measurement timing lag in `SmartKeyboardSafeView` by utilizing a synchronously updated mutable ref (`viewportHeightRef`).
- Fixed ScrollView layout truncation on `/auth` screen by moving centering styles from `contentContainerStyle` to an inner `View` wrapper.
- Fixed Android keyboard covering the welcome form on `/auth` and clipping issues by removing manual padding/KeyboardAvoidingView behavior on Android, relying natively on the OS window `adjustResize` logic, and restoring `flexGrow: 1` to ensure the form correctly recalculates and centers itself within the dynamically shrinking viewport.
- Fixed `/updates` screen title disappearing during APK download by decoupling the download state (`isDownloading`) from the header's `loading` prop.
- Refactored `SmartScreenHeader` layout to guarantee zero layout shift using `minWidth` and flex alignment on the right section, and precisely matched skeleton loader dimensions to text line heights to prevent 1px bounding box jumps during loading states.

### Removed
- Removed the custom `KeyboardSafeView` and `KeyboardSafeFlatList` components (`src/core/KeyboardSafeView`) to align with standard React Native event propagation and cross-platform layouts.
- Rewrote `SmartScreenHeader` to premium production-grade quality, incorporating a left-aligned layout for back button, title, and subtitle, and a fixed-width right section (`176px`) to completely guarantee Zero Layout Shift during navigation.
- Added a pulsing `Animated.View` skeleton block loader in `SmartScreenHeader` to replace title/subtitle text during loading states (`isLoading`/`loading`), preserving exact layout constraints and applying a smooth fade-in micro-animation when loading completes.
- Implemented a reusable `headerActions` prop in `SmartScreenHeader` to resolve predefined keys (`'search'`, `'notifications'`, `'cart'`, `'settings'`, `'refresh'`, `'scanner'`) and custom configuration objects, avoiding hardcoded action button JSX inside screen files.
- Refactored `FeedScreen` to use the new reusable `headerActions` configuration.
- Modified `UpdatesContext` to keep all downloaded APK files in local storage by disabling the automatic pruning of older version files, allowing users to view and manage all cached files.
- Modified the `/updates` page to show the cached APK installers list on all platforms when files exist, rather than restricting it to Android.
- Fixed the "Share Link" button on the updates screen to use React Native's native `Share` API instead of `expo-sharing` (which only supports sharing local file URIs).
- Modified the updates download flow to download files to a `.tmp` path first and rename them to `.apk` only upon successful completion, ensuring incomplete or partial downloads are ignored in the cached installers list.
- Fixed Android startup redirection to `/updates` when a newer version is available by delaying the layout transition until the stack navigator mounts, and by performing a version redirection check in the root index component.

### Added
- Created a reusable, high-fidelity, New Architecture (Fabric) compatible `SmartKeyboardSafeView` component under `src/core/smart-keyboard-safe-view` to handle keyboard avoidance, scroll containment, and automatic scrolling to focused text inputs on iOS, Android, and web.
- Added `loading` translation key to local translation files (`en`, `fr`, `ar`, `tn_latn`, `tn_arab`).
- Added startup APK cleanup in `UpdatesContext`: on Android app launch, deletes all `.tmp` files (incomplete downloads), unrecognized/corrupted files, and older version APKs — keeping only the single highest-version APK file.

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
