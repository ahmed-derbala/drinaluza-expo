## [1.34.1] - 10 july 2026
### Fixed
- Fix Require cycles circular dependency warnings:
  - Refactored `UpdatesScreen.tsx` to import useUpdates and isVersionGreater directly from their files instead of the barrel index.
  - Refactored `SmartKebabMenu.tsx` to import updates utilities directly, breaking the indirect circular reference to `SmartHeader`.
- Fix product edit/create gallery payload submission in `CreateProductScreen.tsx`: filtered out the temporary thumbnail placeholder object (`_id: 'thumb'`) before dispatching the payload to prevent it from being persisted inside the `media.gallery` database collection on the server.
- Fix Android production APK black screen issue after login: replaced direct `router.replace('/feed')` calls with a state-driven redirection `useEffect` in `AuthScreen.tsx` observing the authenticated `user` context. This ensures that the user session state is fully updated and propagated to all layout and tab providers prior to initiating navigation, completely avoiding the React Navigation Android crash caused by dynamic tab options reconstruction during transition animation.
- Fix automatic redirect loop (reversion to `/feed` screen): resolved the issue where unauthenticated API calls returning 401 cleared the token in storage but left the user context populated, triggering an instant redirect back to `/feed` upon reaching the login screen. Added token verification inside the `AuthScreen` redirection layout to clear the user context when the token is missing from storage, allowing the user to stay on the auth screen.

### Changed
- Refactor dashboard product details to support inline editing directly inside `dashboard/:businessSlug/products/:productSlug/`:
  - Removed the separate edit route screen (`edit.tsx`).
  - Updated the dashboard products list to link directly to the direct index path.
  - Mapped the dashboard product index route to `EditProductScreen` to enable section-by-section editing out of the box.
  - Removed the edit actions button in `SmartHeader` for product editing and creation screens.
- Align the updates manager layout with Expo Router best practices: refactored the heavy updates screen component from the routing entry point `src/app/updates/index.tsx` to a modular component `src/features/updates/UpdatesScreen.tsx`, simplifying the route definitions directory.
- Improve the first section of the Profile screen with a premium editorial design:
  - Add a beautiful `LinearGradient` banner at the top of the profile card.
  - Position the profile avatar to overlap the banner with a thick border gap matching the card background.
  - Consolidate the camera and upload photo buttons into a single clean edit action button that toggles an options panel (Upload Image vs Enter URL) underneath the avatar.
  - Display the user's localized full name prominently as the primary header, with the `@slug` username as a subtitle.
  - Integrate a metadata row showing the user's registration year with outline icons (keeping the first section clean and preventing address redundancy).
  - Enhance role badges to include specific icons and styled translucent backgrounds.
- Add support for swipeable product image carousels in feed cards (`products.card.tsx`):
  - Aggregated both the primary thumbnail and gallery images into a single computed array.
  - Replaced the static main image container with a horizontally swiping `ScrollView` when multiple media resources are resolved.
  - Integrated active pagination indicator dots centered on the bottom overlay container.
  - Implemented dynamic `onLayout` width measurements to support clean column sizes in web and mobile responsive grids.
  - Integrated an automatic sliding loop transitioning every 4 seconds, with touch/click auto-reset controls.
  - Added absolute hover chevron button overlays on Web to simplify navigation controls.
- Add share and copy link actions inside the QR Code Modal (`QRCodeModal.tsx`):
  - Integrate clipboard copying via Expo's `expo-clipboard` library.
  - Implement native system link sharing using React Native's `Share` API.
  - Redesign the action button layout to display two balanced rows of options (Download/Print and Copy Link/Share).
- Enable text selection and copying globally on Web:
  - Inject a platform-specific stylesheet inside the root app layout (`src/app/_layout.tsx`) that enforces `user-select: text !important` for all elements on the web platform.
  - Exclude interactive buttons, image elements, and navigation tabs (`user-select: none !important`) to maintain a native app feel and prevent highlighting during click actions.
- Convert the fullscreen photo lightbox preview into a globally reusable feature:
  - Add the `enableFullscreenPreview?: boolean` optional prop to the `SmartImageProps` contract.
  - Implement self-contained modal toggles, backdrop click triggers, styled close buttons, and layout styles directly inside the `SmartImageViewer` component.
- Improve the design and responsiveness of the Business Details screen (`BusinessDetailsScreen.tsx`):
  - Refactor static style variables to a dynamic `createStyles` generator block matching ecosystem best practices.
  - Render a top LinearGradient cover banner with the circular store logo overlapping it, increasing the avatar diameter to 120px for a more prominent visual profile.
  - Enable fullscreen photo preview on the business logo avatar by simply using the new declarative `enableFullscreenPreview={true}` prop on `SmartImage`.
  - Display the business localized name, status badge (`StateBadge`), ratings, and business description inside the header segment.
  - Integrate a horizontal communication and navigation row (Call, WhatsApp, Email, Get Directions) with circular button states, removing the redundant QR Code shortcut from the card body.
  - Fetch and render the business owner's profile avatar photo dynamically via an asynchronous `getUserBySlug` API call, displaying it inside the metadata grid.
  - Redesign the products list catalog into a horizontal, swipeable scroll container with an active scroll bar to browse items fluidly on both web and mobile.
  - Redesign the product cards to use a vertical layout, positioning thumbnails at the top with overlays for "Out of stock" badges, and catalog details below the media.
- Improve the Profile screen (`ProfileScreen.tsx`):
  - Enable fullscreen photo preview on the main profile avatar using the declarative `enableFullscreenPreview={true}` prop on `SmartImage`.


## [1.33.1] - 10 july 2026
### Changed
- Display last access date with relative elapsed period for saved accounts on the Auth Screen.
- Add a dedicated remove button (trash icon) to delete saved accounts with a confirmation prompt.
- Align `AuthScreen.tsx` and related root files with Expo Router best practices:
  - Simplify `src/app/auth/index.tsx` by directly exporting `AuthScreen` instead of wrapping it in a redundant fragment and duplicate `<Stack.Screen>` component.
  - Fix consistent path naming for index routes by restoring `auth/index` in `src/app/_layout.tsx`.
  - Replace index redirect logic in `src/app/index.tsx` from `useEffect` with the native `<Redirect>` component for faster startup navigation.
  - Decouple routing paths from physical folder layouts by replacing all coupled route group references `/(home)/feed` with clean relative paths `/feed` in `AuthScreen.tsx`, `app/index.tsx`, and `app/updates/index.tsx`.
### Fixed
- Fix keyboard flickering on all screens: `SmartHeader.tsx` had `key={\`header-${headerHeight}\`}` on its root `Animated.View`. When the Android keyboard opened, window resize caused insets to fluctuate → `headerHeight` changed → `setHeaderHeight` fired → the header's `key` changed → React fully unmounted and remounted the header and its entire sibling tree (including `KeyboardAvoidingView`) → destroyed the focused `TextInput` → keyboard dismissed → loop. Removing the dynamic `key` prop stops the remount cycle.
- Fix instant keyboard dismissal upon focusing inputs on Android: `AuthScreen.tsx` applied `android: { elevation: 2 }` dynamically on the wrapper view of focused inputs. Toggling shadow elevation layer on Android invalidates layout focus hierarchy and forces the focus manager to reset input focus to the root window view, dismissing the keyboard. Removing the dynamic elevation property fixes focus stability.
- Fix blocked screen scrolling when keyboard is visible on Android: added a dynamic keyboard-height listener and conditionally appended a bottom spacer (`height: keyboardHeight`) inside the ScrollView on Android. This forces the scrollable content container height to expand by the soft keyboard's height when active, enabling full scrolling responsiveness.
- Fix text inputs being covered by soft keyboard on focus: implemented a stable programmatic `scrollToInput` handler inside `AuthScreen.tsx` that triggers on input focus. Now that unmount and focus resets (dynamic keys, dynamic elevation transitions) are fixed, measuring offsets and triggering scrolling is fully safe, centering input fields smoothly above the keyboard.
- Fix React Native runtime warning regarding calling `measureLayout` with composite component refs: wrapped `ScrollView` children inside a native `View` element with `ref={contentRef}`. This provides a valid native layout component for measuring, resolving the runtime warning.

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
- Show specifications (caliber size badge and origin location chip) directly inside the product cards in `products.card.tsx`, `BusinessProductsScreen.tsx`, and `BusinessDetailsScreen.tsx`.
- Include `specs` properties during feed items data normalization inside `feed.api.ts` to ensure cards display specs inside the feed screen.the Feed screen.
