## [1.33.1] - 10 july 2026
### Fixed
- Fix keyboard flickering on all screens: `SmartHeader.tsx` had `key={\`header-${headerHeight}\`}` on its root `Animated.View`. When the Android keyboard opened, window resize caused insets to fluctuate → `headerHeight` changed → `setHeaderHeight` fired → the header's `key` changed → React fully unmounted and remounted the header and its entire sibling tree (including `KeyboardAvoidingView`) → destroyed the focused `TextInput` → keyboard dismissed → loop. Removing the dynamic `key` prop stops the remount cycle.
- Fix instant keyboard dismissal upon focusing inputs on Android: `AuthScreen.tsx` applied `android: { elevation: 2 }` dynamically on the wrapper view of focused inputs. Toggling shadow elevation layer on Android invalidates layout focus hierarchy and forces the focus manager to reset input focus to the root window view, dismissing the keyboard. Removing the dynamic elevation property fixes focus stability.
- Fix blocked screen scrolling when keyboard is visible on Android: added a dynamic keyboard-height listener and conditionally appended a bottom spacer (`height: keyboardHeight`) inside the ScrollView on Android. This forces the scrollable content container height to expand by the soft keyboard's height when active, enabling full scrolling responsiveness.
- Fix text inputs being covered by soft keyboard on focus: implemented a stable programmatic `scrollToInput` handler inside `AuthScreen.tsx` that triggers on input focus. Now that unmount and focus resets (dynamic keys, dynamic elevation transitions) are fixed, measuring offsets and triggering scrolling is fully safe, centering input fields smoothly above the keyboard.
- Fix React Native runtime warning regarding calling `measureLayout` with composite component refs: wrapped `ScrollView` children inside a native `View` element with `ref={contentRef}`. This provides a valid native layout component for measuring, resolving the runtime warning.

### Changed
- Align `AuthScreen.tsx` and related root files with Expo Router best practices:
  - Simplify `src/app/auth/index.tsx` by directly exporting `AuthScreen` instead of wrapping it in a redundant fragment and duplicate `<Stack.Screen>` component.
  - Fix consistent path naming for index routes by restoring `auth/index` in `src/app/_layout.tsx`.
  - Replace index redirect logic in `src/app/index.tsx` from `useEffect` with the native `<Redirect>` component for faster startup navigation.
  - Decouple routing paths from physical folder layouts by replacing all coupled route group references `/(home)/feed` with clean relative paths `/feed` in `AuthScreen.tsx`, `app/index.tsx`, and `app/updates/index.tsx`.

## [1.33.0] - 10 july 2026
### Changed
- Complete redesign of `AuthScreen.tsx` with an editorial minimalist dark aesthetic:
  - Pure black (`#000`) background with no gradients or glow blobs.
  - Mobile-only large bold editorial hero header with logo chip + brand name row.
  - Horizontal avatar chip strip for saved accounts (photo + @slug label), replacing the vertical card list — tap to switch, long-press to remove.
  - Flat labeled text inputs (label above, no card wrapper), with single-pixel dark borders that ring cyan on focus.
  - Clean squared checkbox toggles replaced old Ionicons checkbox pattern.
  - Full-width `Continue` button with cyan horizontal linear gradient and glow shadow.
  - Desktop/tablet dual-pane layout: left dark branding panel with headline and feature bullet list; right clean form panel.
  - Language selector redesigned as minimal pill chips with flag + optional letter badge.

## [1.32.8] - 10 july 2026
### Added
- Add split desktop/tablet dual-pane grid layout to `AuthScreen.tsx` with a premium left-pane marketing showcase, bullet-point managers capabilities list, and vector logo emblem.
- Add glowing ambient linear gradient backdrop blob overlays to `AuthScreen.tsx`.
- Add active focused borders highlighting dynamic styling to credentials form username and password inputs in `AuthScreen.tsx`.

### Fixed
- Fix header overlay clipping by adding mathematical header height padding offset (`56 + insets.top`) to `AuthScreen.tsx` scroll content container.
- Fix rapid keyboard flickering/disappearing by removing programmatic scrollToInput focus scroll listeners, allowing native OS scroll-on-focus keyboard adjustments to align the active textinput fields smoothly.

### Changed
- Redesign `AuthScreen.tsx` container into a glassmorphic translucent slate container panel with fine borders, clean segmented horizontal language selectors, and gradient action buttons.

## [1.32.0] - 10 july 2026
### Removed
- Remove custom `KeyboardAvoidingWrapper` component and replace all references with standard native `KeyboardAvoidingView` and `SmartHeader.ScrollView`.

### Fixed
- Fix keyboard concealing input fields and scroll boundaries in `AuthScreen.tsx` by replacing `SmartHeader.ScrollView` with a plain `ScrollView`, implementing layout spacers that automatically unmount when the keyboard is visible, and scrolling the ScrollView using precise `measureLayout` positions of focused input fields.

## [1.27.60] - 10 july 2026
### Changed
- Remove `editable={!loading}` from the username and password text inputs in `AuthScreen.tsx`, wrapping the form in a `View` with `pointerEvents={loading ? 'none' : 'auto'}` instead. This resolves the Android native input recreation issue that was clearing the username state and detaching the input focus reference.
- Simplify `focusPasswordField` in `AuthScreen.tsx` to use the standard React Native `ref.focus()` method with a minor layout timeout, removing the redundant `UIManager` and recursive retry focus loop.
- Refactor `getAccountDisplayName` in `AuthScreen.tsx` to use the standard `localize` function from user context.
- Clean up unused imports (`UIManager`, `findNodeHandle`, `showAlert`) and remove unnecessary debug console logs.
- Add support for a `skipAuthRedirect` custom header in the Axios response interceptor (`src/core/api/index.ts`) to prevent a 401 error from trigger-routing back to `/auth`, avoiding full screen remounts on authentication screens when quick-switch token checks fail.
- Uncheck the "Require password on switch" option by default (`needPassword = false`) when populating credentials for a saved account.
- Configure the default `behavior` in `KeyboardAvoidingWrapper.tsx` to `undefined` on Android. This avoids double-resizing layout corruptions on orientation changes/keyboard toggles (since Android's native `softwareKeyboardLayoutMode` is set to `"resize"` in `app.config.js`).
- Conditionally align the authentication card ScrollView to `'flex-start'` instead of `'center'` in `AuthScreen.tsx` when the screen height is under 550px. This prevents layout clipping and corruption on landscape phone viewports.

### Fixed
- Fix authentication errors where sign-in or sign-up API failures were not logged using the unified logging system.

## [1.27.59] - 9 july 2026
### Changed
- Remove general and location tabs from Edit Business Screen, rendering all cards vertically in a unified scrollable list.
- Integrate the standard `SmartHeader` component in Edit Business Screen, and disable the default React Navigation header.
- Fallback to `item.business?.media?.thumbnail?.url` in feed business cards (`businesses.card.tsx`) if `item.media` is not populated directly.
- Replace generic store icon inside business metadata card on Product Details screen (`ProductDetailScreen.tsx`) with the actual business thumbnail image when available.

### Added
- Add support for direct thumbnail upload from the Edit Business Screen hero banner using `expo-document-picker` and the file upload service.
- Add support for new business schema fields: `address.postalCode` (editable inside the Address section), `contact.backupPhones` list (with add and delete actions in the Contact section), and `location` metadata including GPS-retrieved or manual `accuracy`, `altitude`, `heading`, and `speed`.
- Populate `media` field under nested `business` object inside doc normalization on the feed API (`feed.api.ts`).
- Update TypeScript interface definitions for `OrderItem` in `orders.interface.ts` and `ProductType` in `products.type.ts` to type the nested `business.media` structure.

### Fixed
- Fix infinite loading/fetch loop on Purchases screen (`PurchasesScreen.tsx`) by storing purchasesState and cartState in stable Refs and clearing the useCallback dependency list.
- Fix password input focus failure on quick-switch auth failure (`AuthScreen.tsx`) by implementing a recursive retry-based focus loop (`attemptFocus`).
- Ensure slug field is populated, password field is cleared, and slugError is reset upon selecting a saved account when a switch fails or requires password.

## [1.27.55] - 9 july 2026
### Added
- Add `MultilingualNameInput.tsx` inside `src/features/common/` as a reusable component wrapping localized English, Tunisian Latin, and Tunisian Arabic name input fields.
- Add "Edit Business" quick action card button inside the main `Dashboard.tsx` view to navigate directly to the edit business layout.
- Add automatic setting of `media.thumbnail` to match the selected default product's thumbnail URL on product creation.
- Add reusable component `StateBadge.tsx` inside `src/features/common/` to parse and represent backend state schema values (`pending`, `active`, `suspended`, `deleted`, `inactive`) with unified dot indicators, themed colors, and localization labels.
- Add reusable component `ProductGallerySection.tsx` inside `src/features/products/common/` that handles both editable multi-image gallery uploads and read-only thumbnail sliding selectors.
- Add reusable component `ProductSpecsSection.tsx` inside `src/features/products/common/` that handles both caliber selector / address inputs (for form editors) and caliber size badge / origin details representation (for detail views).
- Add support for product media galleries (`media.gallery`) aligned with the backend `FileRefSchema` schema.
- Implement multi-photo upload to `media.gallery` on `CreateProductScreen.tsx` and `EditProductScreen.tsx` with multi-select support (`multiple: true` up to 5 photos maximum), real-time counter indicators, deletion actions, and automatic fallback setting for the main product thumbnail.
- Add an interactive product media gallery component on `ProductDetailScreen.tsx` using horizontal scroll list with state-based active image selector.
- Add product specifications (caliber size descriptors, and origin address) to the product creation screen with pre-populated backend-aligned defaults ('Ellouza' city, 'Sfax' region, '3016' postal code, 'Tunisia' country), default inventory values (stock quantity 100, alert threshold 10), and validation guards.
- Wrap the product creation form inside `KeyboardAvoidingWrapper` to improve cross-platform keyboard handling on mobile viewports.
- Extract `getCaliberLabel` helper to a shared module `products.helpers.ts` to enforce DRY principles, updating caliber labels across the feed screen, products list screen, business details screen, and product detail screen to use the values 'Tiny', 'Small', 'Medium', 'Large', and 'Huge'.
- Add support for new product specifications (`SpecsSchema` containing caliber and origin).
- Define the `ProductSpecs` interface in `businesses.interface.ts` and add `specs?: ProductSpecs` fields across `Product` in `businesses.interface.ts`, `Product` in `orders.interface.ts`, `ProductType` in `products.type.ts`, and `FeedItem` in `feed.interface.ts`.
- Redesign the `ProductDetailScreen.tsx` metadata section to display product specifications (a localized caliber size pill badge, and country/city origin of the seafood product).
- Show specifications (caliber size badge and origin location chip) directly inside the product cards in `products.card.tsx`, `BusinessProductsScreen.tsx`, and `BusinessDetailsScreen.tsx`.
- Include `specs` properties during feed items data normalization inside `feed.api.ts` to ensure cards display specs inside the feed screen.

### Changed
- Refactor `ProfileScreen.tsx`, `EditBusinessScreen.tsx`, and `CreateProductScreen.tsx` to use the new reusable `MultilingualNameInput` for multilingual name input editing.
- Refactor `EditBusinessScreen.tsx` and `CreateProductScreen.tsx` (in edit mode) to implement section-by-section inline edit/save/cancel controls on the top right of each card, rendering read-only values when locked, and saving changes directly to the backend.
- Update `EditProductScreen.tsx` to support the new section inline editing flow, keeping the user on the screen and displaying success toasts on save without immediate redirect.
- Refactor `CreateProductScreen.tsx` to accept customizable props (`isEditMode`, `product`, `onSubmitOverride`, `submitLabel`), and completely rewrite `EditProductScreen.tsx` to render `CreateProductScreen` under the hood to ensure full code reuse for future form fields.
- Refactor `CreateProductScreen.tsx` and `ProductDetailScreen.tsx` to utilize the new reusable `ProductGallerySection` and `ProductSpecsSection` components, completely removing duplicated styles, scripts, and layouts.
- Outline the bottom navigation tab bar ("dash") with the primary theme color.
- Refactor `ProfileScreen.tsx` to display user account status via the reusable `<StateBadge>` component.
- Upgrade the product state selector inside `CreateProductScreen.tsx` to a segmented picker supporting Active and Suspended options only, and conditionally hide it entirely when creating products.
- Rename product "Status" translation label to "State" in `CreateProductScreen.tsx` and `ProductDetailScreen.tsx` to align exactly with backend nomenclature.
- Move the product creation screen route from `/dashboard/[businessSlug]/products/create` to `/dashboard/[businessSlug]/create-product` inside `_layout.tsx`, updating all dashboard and business FAB navigation references.
- Refactor the hero image preview path in `ProductDetailScreen.tsx` to construct a combined gallery array containing both the main product thumbnail and custom uploaded gallery images.
- Redesign `EditBusinessScreen.tsx` from scratch using a modern segmented tab layout, adding a beautiful top hero banner with real-time business title rendering, integrating `StateBadge` to display current status, exposing the business profile `description` input, and utilizing premium focus-styled text inputs, location coordinates chips, and full KeyboardAvoidingWrapper integration.

### Removed
- Remove `singlePieceMetrics` (piece length and weight) from product specs interface, creation form, payload mapping, and details page visualization.
- Remove all references to the obsolete `photos` field on products across interfaces, payload mappings, details/cards rendering, and fallback checks.
- Remove redundant success toast notifications shown on successful user sign-in, account registration (sign-up), and quick account switching.
- Remove automatic generation and updating of `media.thumbnail` when users upload or edit photos in the product gallery.

### Fixed
- Relocate `combinedGallery` hook above early return blocks in `ProductDetailScreen.tsx` to fix React Rules of Hooks violation and prevent crashes.
- Refine state-driven focus logic in `AuthScreen.tsx` by implementing a recursive retry mechanism (`focusWithRetry`), clearing the password field on quick switch failures, adding `keyboardShouldPersistTaps="handled"` to the nested ScrollViews, and adding console logging to trace the Android focus timeline.

## [1.27.54] - 7 july 2026
### Changed
- Reimplement the Purchases screen based on `SalesScreen.tsx` at `/purchases` as a single route screen using `status` query parameters (e.g. `/purchases?status=pending`).
- Revert directory-based nested routing folders under `src/app/purchases/` and restore `src/app/purchases.tsx` flat route.
- Implement horizontal status filter ScrollView inside `SmartHeader`'s `headerBottom` parameter in `PurchasesScreen.tsx`, matching the `SalesScreen` pattern.
- Integrate `ORDER_STATUSES` from `src/features/orders/orders-statuses.ts` for order status rendering and tracking.
- Revert all in-app navigation routes pointing to `/purchases/cart` back to `/purchases?status=cart` across feed, product, business, profile, search, and SmartHeader modules.
- Rename `src/features/orders/orderStatus.ts` to `src/features/orders/orders-statuses.ts` and rename `orderStatusEnum` to `ORDER_STATUSES`.
- Implement document-level outside click listener on web inside `SmartKebabMenu.tsx` to ensure the menu closes when a user clicks anywhere outside of the dropdown container.
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
- Delete unused `dotenv` dependency from `package.json`
