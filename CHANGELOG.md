## [1.27.45] - 5 july 2026
### Fixed
- Register the root settings route under the custom `SmartHeader` component inside `src/app/_layout.tsx`, and update `SettingsScreen.tsx` to dynamically configure header parameters and action items using `<Stack.Screen>` instead of `<Tabs.Screen>`.
- Implement document-level outside click listener on web inside `SmartKebabMenu.tsx` to ensure the menu closes when a user clicks anywhere outside of the dropdown container.

### Changed
- Reorganize static settings data (LANGUAGES, CURRENCIES, and SOCIAL_PLATFORMS) by moving them from `src/config/settings.ts` to a newly created constants directory `src/core/constants/settings.ts` to cleanly decouple static UI configurations from dynamic environment variables.

## [1.27.43] - 3 july 2026
### Added
- Redesign `ProductDetailScreen.tsx` from scratch with responsive split-column layout on web/tablets, full-bleed hero banner images, glowing stock status indicators, and clean stepper controls.
- Add user-friendly, localized formatting for raw network exceptions inside the updates screen error container.

### Changed
- Configure the bottom navigation tab bar (`dash`) as a floating, centered GNOME-style capsule (dock) centered natively via a full-width container wrapper with `alignItems: 'center'`, ensuring it is always centered on portrait and landscape orientations without any rotation lag or safe-area layout offsets.
- Optimize `ProductDetailScreen.tsx` layout and hero banner height dynamically for landscape mobile viewports.
- Enforce environment variables rules in `ProductDetailScreen.tsx` by resolving frontend URLs from centralized `config.frontend.url` configurations.
- Fix update checker Android mount bug where launching directly into updates screen skipped network update checks.
- Move the settings route configuration (`settings.tsx`) outside the `(home)` layout (tab bar shell) and delete the settings tab screen definition from `_layout.tsx` entirely, removing the settings tab from the dash.
- Remove dynamic conditional wraps from all `<Tabs.Screen>` children of the home layout navigator to resolve the 'Layout children must be of type Screen' console warnings, mapping tab visibility strictly via static screen declarations with standard `options.href` parameter checks in the custom tab bar renderer.
- Enable hide-on-scroll functionality for the bottom navigation tab bar (dash) by linking layout's scroll-visibility state (`isTabBarVisible`) to CSS translation and opacity transition transforms on the floating wrapper.
- Enforce layout filtration rules to ensure the dashboard tab icon is shown in the bottom tab bar (dash) only if the user role is `business_owner`, utilizing a custom `options.isVisible` property (cast as `any` and explicitly typed at callback levels to bypass strict routing schema typechecks) to prevent dynamic `options.href` mutations from showing the tab to customer roles.

## [1.27.37] - 3 july 2026
### Changed
- Update `FeedScreen` background styling to dynamically retrieve and apply the theme background color `colors.background` instead of using a hardcoded `#0A0E1A` hex color.
- Update `SmartImageViewer` to enforce the `contain` fit mode, ensuring images display fully across the entire app without any cropping.
- Ensure all screens use the centralized `SmartImageViewer` component for rendering images, and export both `SmartImageViewer` and `SmartImage` for clean import naming.
- Restrict `SmartImageViewer` from rendering any background color under/behind loaded images by stripping the `backgroundColor` style parameter from both style and containerStyle props, and clean up background colors in product card and business banner image wrappers.
- Remove unused screen file `src/features/products/ProductsScreen.tsx`.
- Migrate `BusinessProductsScreen.tsx` list grid to `SmartHeader.FlashList` with an estimatedItemSize of 240px to optimize view recycling and scroll frame rates.
- Update the updates manager page to use the theme's blue/info colors for the download progress bar gradient.
- Enforce consistent card background color across all feed components (ProductCard, BusinessCard, UserCard) by migrating them from hardcoded background hexes to dynamic theme colors (colors.card).
- Remove all references and code traces of LightTheme, lightColors, and ThemeMode toggling state/storage, locking the application to DarkTheme exclusively.
- Rename `darkColors` to `colors` in `colors.ts` and update all theme contexts to export/import only `colors` to streamline theme references.
- Resolve strict TypeScript compile warnings by cleaning up unused imports and state variables in `UpdatesContext.tsx`, `SmartImageViewer/index.tsx`, `UserDetailScreen.tsx`, `SalesScreen.tsx`, and `BusinessProductsScreen.tsx`.


## [1.27.36] - 3 july 2026
### Changed
- Relocate the product name in `ProductCard` from the image overlay to the card body below the image on the left. Remove the now-unused linear gradient and clean up dependencies.
- Refactor the screen stack wrappers in `src/app/_layout.tsx`, `src/app/(home)/_layout.tsx`, `src/app/dashboard/_layout.tsx`, `src/app/businesses/_layout.tsx`, `src/app/products/_layout.tsx`, and `src/app/users/_layout.tsx` to dynamically query and apply the theme background color `colors.background` instead of using a hardcoded black background.

### Added
- Redirect the application automatically to the updates screen on startup if there is a new release version available to download or a downloaded APK ready to install.

## [1.27.23] - 2 july 2026
### Fixed
- Fix update package corruption and incorrect download percentage display when resuming an interrupted update download on app restart by tracking active download states via a local storage key and executing startup cleanup of incomplete/stale `.tmp` files.
- Fix visual layout shifts (horizontal and vertical) in `SmartHeader` by introducing stable width boundaries on the actions section and aligning loading placeholders to the exact line heights of expected title and subtitle text components.
- Pass expected subtitle metadata dynamically to `SmartHeader` in user and business detail loading states to reserve skeleton loader layout boundaries and prevent vertical jumps when data loading completes.
- Fix updates screen content being obscured by the absolute-positioned `SmartHeader` by replacing standard `ScrollView` with `SmartHeader.ScrollView` to automatically apply the correct top padding.
- Fix `SmartHeader` obscuring the top screen content on `/users/:userSlug` and `/businesses/:businessSlug` detail screens by replacing standard `ScrollView` with `SmartHeader.ScrollView` and implementing style-merging in scroll wrappers to add `headerHeight` to custom `paddingTop` margins instead of letting them override it.
- Fix `SmartHeader` staying stuck in loading animation state on `/businesses/:businessSlug` screen by explicitly passing `isLoading: false` in the loaded screen stack options to clear React Navigation's merged option cache.
- Fix `SmartHeader` obscuring top screen content across all app screens (including Feed, Search, Settings, Profile, Dashboard, Products, Businesses, Notifications, Purchases, and the `/products/:productSlug` details screen) by replacing standard scroll/list views with their `SmartHeader` equivalents and applying dynamic Y-offsets on root container views.
- Fix flash of home/feed screen and remove splash/loading screen on launch by redirecting instantly to the feed route on startup and performing OTA update checks asynchronously in the background without blocking layout mounting.
- Fix web version of `FeedScreen` layout overlapping `SmartHeader` by replacing standard `ScrollView` with `SmartHeader.ScrollView` in the web rendering block to automatically inherit and apply the `headerHeight` top padding offset.
- Fix web version of `SmartHeader` leaving a blank/black space when scrolling down by standardizing its layout positioning style to `absolute` across all platforms, and applying the corresponding `headerHeight` top padding offset in web list and scroll wrappers to match mobile behavior.
- Fix web version of `SmartHeader` and bottom navigation bar not hiding/showing on scroll by binding a document-level capture-phase scroll listener inside `useScrollHandler` on the web to capture scroll offsets from nested overflow divs.
- Fix header and bottom navigation bar scroll hiding/showing transitions to trigger instantly with zero animation or transitions on all platforms, preventing screen layout flickering and aligning behavior across all screens.
- Fix bottom navigation bar icon centering and alignment across active/inactive states by introducing a unified `renderTabBarIcon` helper that wraps all icons in identical layout containers and configuring centered flexbox options in `tabBarItemStyle` and `tabBarIconStyle`.

### Changed
- Redesign the dash (bottom navigation bar) from scratch with a modern minimal aesthetic. Use a clean frosted-glass floating pill centered via `tabBarBackground` (`alignSelf: 'center'`, `width: barWidth` at 48px per tab) with no visible borders, a deeper semi-transparent slate background (`rgba(15, 23, 42, 0.6)`), soft ambient shadow, and uniform 44px height. Simplify icons to Ionicons outline/filled pairs at 20px with color-only active state (no wrapper containers, dots, or borders). Remove unused style definitions and imports.
- Improve updates screen layout design to use a premium modern aesthetic, featuring an elevated status card with double glow-rings, a centered comparison chevron transition, inline icons on release details row elements, and sleeker button contours.

### Added
- Calculate and display remaining download time and download speed during OTA updates on native.
- Modernize the updates screen layout, using rich LinearGradients, transparent borders, and consistent translucent dark glassmorphism card styling.
- Check for a downloaded installable update APK on startup and automatically trigger its installation if found.
- Display update release version numbers on the updates screen action buttons (Download/Install).

### Changed
- Navigate to the global product details route (`/products/:productSlug`) instead of the business-nested route when pressing a product card on the feed screen.
- Position the address info block above the contact buttons row in feed cards (products and businesses).
- Remove press and click scaling/opacity animations on feed screen cards (products, businesses, and users).

## [1.27.17] - 1 july 2026
### Fixed
- Prevent update download progress percentage from jumping to 100% when paused.
- Keep update download from starting from the beginning on app restart by persisting download progress and preventing premature cleanup of resume data on pause or cancel.
- Fix resume download failing after app restart by converting JSON-deserialized `resumeData` back to its expected string format on startup.
- Fix premature function exits in download catch blocks by removing redundant `resumeData` checks and relying strictly on explicit pause flags.
- Fix `SmartHeader` being hidden on `/users/:userSlug` and `/businesses/:businessSlug` detail screens by resetting header and tab bar visibility states to `true` on route changes.
- Fix screen and list flickering during scrolls by positioning `SmartHeader` absolutely on Mobile and using native `translateY` translations to completely eliminate height layout shifts.
- Fix status filter bar staying visible in Sales screen on scroll down by using a dynamic key matching `headerHeight` on the container `Animated.View` to force re-serialization of translateY interpolation ranges to the native driver.
- Fix status filter bar scrolling and tap clicks being blocked on iOS/Mobile by configuring `headerTransparent: true` and explicitly setting the `headerStyle.height` option to match the expanded header height in `SalesScreen` stack options to prevent clipping.
- Fix status filter bar horizontal scroll lock on Mobile by setting `width: '100%'` style constraints on the ScrollView container to prevent it from matching content dimensions.

### Added
- Add reusable scroll views `SmartHeader.ScrollView`, `SmartHeader.FlatList`, and `SmartHeader.FlashList` to automatically manage and hide/show `SmartHeader` on scroll down, which now automatically inject correct top padding and indicator offsets on mobile platforms.
- Add support for screen-specific bottom node sections (`headerBottom` and `headerBottomHeight`) inside `SmartHeader` to slide filter bars or sub-headers together natively.
- Add dynamically updated `headerHeight` tracking inside `LayoutContext` to coordinate container heights with scroll offsets.

### Changed
- Allow user, business, product, and account names and slugs to wrap to 2 lines instead of truncating at 1 to gracefully support lengths of up to 50 characters.
- Stack contact actions on separate rows below names and slugs in card layouts (users, businesses, and products) to maximize width and avoid truncation.
- Optimize `SmartHeader` hide/show scroll transitions using native-driven (`useNativeDriver: true`) `translateY` translation and opacity transitions for smooth 60fps frame rates.
- Integrate the Sales screen status filter bar directly into `SmartHeader` as a bottom content node so it hides/shows inline with scrolling and never causes screen layout shifts.
- Refactor the Sales screen lists to use `SmartHeader.FlashList` and embed the active filters info banner in the list's `ListHeaderComponent`.

### Removed
- Remove category filter bar from the top of the Feed screen.


## [1.27.12] - 28 june 2026
### Changed
- Relocate `HeaderActionButton` component to `src/core/smart-header/` alongside other core header components.
- Refactor `PurchasesScreen.tsx` to use the standardized `<EmptyState>` component instead of custom inline empty views.
- Refactor `ProductDetailScreen.tsx` and `UserDetailScreen.tsx` to use the standardized `<LoadingState>` component.

### Removed
- Delete unused `HeaderTitle.tsx` component from `src/features/common/`.
- Delete unused `dotenv` dependency from `package.json`.

## [1.27.11] - 28 june 2026
### Added
- Move `HeaderRefreshButton` component from `src/features/common/` to `src/core/smart-header/` to make it a self-contained core header subcomponent.
- Show standard `SmartHeader.RefreshButton` on the header of the Updates screen.

### Changed
- Remove platform-specific `marginRight` layout styles from `HeaderRefreshButton` to enforce spacing consistency via parent layout container.
- Update import statements in all 12 screen/feature files to import `HeaderRefreshButton` from `@/core/smart-header`.
- Remove redundant inline "Refresh" button from native actions list in the Updates screen body, and clean up the "Check Updates" and "Refresh" buttons in the Web layout.
- Redesign the Updates screen with modern glassmorphic card containers, gradient action buttons, pulsing status indicators, and monospace code-styled changelogs.
- Implement a custom lightweight `MarkdownRenderer` helper in the Updates screen to format rich release log notes (headings, list bullets, bold keywords, and inline code formatting).
- Refactor all 13 feature screens (including Dashboard, Product/Business lists and details, Settings, Sales, Purchases, Notifications, and Profile) to use standard `headerActions` navigation options instead of hardcoded `headerRight` custom views.
- Relocate custom header hooks (`headerActions`, `resolvedFallbackRoute`) to the top of `ProductDetailScreen` and `BusinessProductsScreen` before conditional returns to conform to React Rules of Hooks.
- Render `SmartHeader` directly inside `UserDetailScreen` and set native stack header to hidden to bypass nested router layout mismatches.
- Update the custom `SmartHeader.RefreshButton` on the Updates screen to execute both update checks and browser page reloading under Web platforms.

## [1.27.9] - 28 june 2026
### Added
- Create `useResponsiveGrid` custom hook under `src/core/hooks/` to standardize column calculations and card layout boundaries.
- Create `feed.helpers.ts` under `src/features/feed/` to house the reusable `enrichFeedContacts` utility.

### Changed
- Refactor `FeedScreen.tsx`, `SearchScreen.tsx`, and `ProductsListScreen.tsx` to use the centralized `useResponsiveGrid` hook.
- Align `SearchScreen.tsx` to render using the same responsive grid layout on Web as `FeedScreen.tsx`, preventing search cards from stretching too wide on desktop monitors.
- Integrate contact/location enrichment inside `SearchScreen.tsx` so product card contacts are resolved and displayed correctly for search results.
- Hide the Settings tab from the bottom tab bar navigation in `src/app/(home)/_layout.tsx` while keeping its route active.

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

