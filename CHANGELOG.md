# Changelog

## [Unreleased]

### Changed
- Redesigned feed product card layout: business photo, name, and `@slug` now appear top-left; contact (call, WhatsApp) and location (directions) action buttons are consolidated top-right; business address (`street, city, region`) is shown directly below the business row; product name is now overlaid at the bottom of the product image using a `LinearGradient` scrim for legibility.
- Redesigned feed business card layout to match the product card pattern: business photo, name, and `@slug` top-left; call, WhatsApp, email, and directions buttons top-right; address (`street, city, region`) below the header; the banner image remains below as a visual showcase with the rating badge and view arrow overlaid on it.
- Extracted contact/location action buttons into a shared `ContactButtons` component (`src/features/common/ContactButtons.tsx`) used by both product and business feed cards — consistent 36×36 touch targets, color-coded tinted backgrounds (green/call, teal/WhatsApp, indigo/email, amber/directions), accessible labels, and self-hiding when no contact data is present.
- Extended `ContactButtons` with an optional `address` prop (structured street/city/state/country) used as a directions fallback when GPS coordinates are unavailable; applied in `SaleCard` to replace the 4 inline contact/location handlers (73 lines → 5 lines).

## [1.26.4]

### Fixed
- Disabled ANSI escape color codes in the global logger module (`src/core/log/index.ts`) on native platforms (iOS/Android) to prevent raw ANSI sequences from rendering inside React Native's LogBox console UI.

## [1.26.3]

### Added
- Redesigned `/feed` screen and all card types (ProductCard, BusinessCard, UserCard) from scratch with a unified dark-glassmorphic visual system: `#0A0E1A` base, `rgba(15,23,42,0.65)` card surfaces, cyan (`#0EA5E9`) accents, refined filter pills, shimmer skeleton loaders, and consistent responsive multi-column grid layout.
- Added `/home` as a default menu option in `SmartKebabMenu` (using `home-outline` icon) to allow quick navigation back to the feed from any screen.
- Created a new `/about` screen (`src/features/about/AboutScreen.tsx`) containing "Social Media", "Contact", "Downloads", and "Developer" sections and the copyright footer, and registered the stack route `/about` in the root stack layout.
- Added `/about` as a default menu option in `SmartKebabMenu` (using `information-circle-outline` icon) to allow quick navigation from any screen.
- Redesigned the business products management dashboard screen (`/dashboard/:businessSlug/products`) from scratch, featuring live summary metrics, count-aware filter chips, inline active/inactive product toggling, and zero-layout-shift skeleton loaders.
- Implemented business contact action buttons (Call, WhatsApp, Email, Directions) inside product cards in the feed, enabling direct messaging and navigation access to a product's business.
- Added a client-side contact details enrichment engine on the feed screen to dynamically resolve missing business contact fields on product cards from other loaded cards or via lazy background fetching.

### Removed
- Removed currency settings selection and display from the user profile screen.
- Uninstalled unused `react-native-keyboard-aware-scroll-view` dependency from `package.json`.
- Removed deprecated `estimatedItemSize` props from all `FlashList` components, aligning with `@shopify/flash-list` version `2.0.2` New Architecture layout capabilities.
- Completely removed the custom `SmartKeyboardSafeView` component and refactored all usages across the app to use standard React Native `ScrollView` and `KeyboardAvoidingView` components.
- Removed custom `StatusBar` imports and rendering from layouts, disabling app-level alterations to the device's default status bar.
- Removed unused `@react-navigation/native` and `@react-navigation/native-stack` packages from dependencies.

### Changed
- Redesigned the updates screen (`/updates`) from scratch, incorporating a modern dark visual identity with glassmorphic cards, side-by-side version comparisons, and a color-coded environment badge pill (`config.NODE_ENV`).
- Refactored `src/config/index.ts` to export a single consolidated `config` object instead of multiple individual constants, and updated all referencing screens, hooks, and utilities across the codebase.
- Relocated the order status configuration file from `src/config/orderStatus.ts` to `src/features/orders/orderStatus.ts` and updated all importing screens and components (`SalesScreen`, `SaleCard`, `PurchasesScreen`) accordingly.
- Refactored `/settings` screen to remove the "Social Media", "Contact", "Downloads", and "Developer" sections (now residing in `/about`), simplifying its component code, imports, and layout design.
- Updated the updates screen on Web so that clicking the "Download Update" button initiates the file download instantly in the same tab using a programmatically triggered anchor element with the download attribute, rather than opening a new tab/window via Linking.openURL.
- Updated the dashboard screen (`/dashboard`) to stay within the bottom tab navigation view by utilizing query parameters (`businessSlug`) instead of stack navigations, and adjusted the products dashboard screen's back button press to redirect directly back to the tab screen to preserve the bottom navigation tab bar.
- Updated product status state mapping from `'inactive'` to `'suspended'` across product details, edit, feed, and business products screens, ensuring consistency with the database's `STATES` definitions.
- Refactored shadow styling to use centralized, cross-platform `createShadow` and `createColorShadow` helpers.
- Updated Animated transform timing and sequence calls in `SmartKebabMenu`, `SmartScreenHeader`, `Toast`, `HeaderRefreshButton`, and `HeaderActionButton` to use platform-conditional `useNativeDriver` values to avoid web console warnings.
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
- Fixed cards overlapping on `/feed` in the Web version when navigating back from `/purchases` by implementing a custom responsive CSS flex-wrap layout wrapper instead of native list components on Web.
- Resolved TypeScript compilation and syntax errors across card and list screens (`BusinessProductsScreen`, `products.card`, `PurchasesScreen`, `SaleCard`) caused by malformed layout styles.
- Fixed `shadow*` styling warnings on Web by mapping shadow values to CSS `boxShadow` via the `createShadow` theme helper.
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
