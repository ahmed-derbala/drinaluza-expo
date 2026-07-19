## [1.40.7] - 19 july 2026

### Removed
- Remove the sign-out button from the Profile Screen header actions, along with all its unused handlers and API imports.

### Changed
- Trigger server-side sign-out via `POST /api/auth/signout` when a saved account is deleted from the Auth Screen, passing the user's saved authentication token.

### Fixed
- Prevent Axios 401 error logs on the Purchases Screen for guest users by skipping remote backend order fetches when no active session/user exists.
- Eliminate visual flashes of restricted screens during unauthorized navigation transitions by introducing a render-phase routing guard in `_layout.tsx`.
- Intercept cart navigation at trigger points (HeaderCartButton and Toast clicks) for unauthenticated guest users, redirecting them directly to the Login page.
- Fix app lock in offline state for guest users by implementing automatic background connectivity pings in `ConnectionService` and allowing manual refreshes to bypass the offline state block in `useCacheFirst`.
- Subscribe `HeaderRefreshButton` directly to `ConnectionService` to bypass React Navigation stack header context propagation limitations on Android.

## [1.40.2] - 18 july 2026

### Changed
- Redesign the quantity stepper in the product feed card with a high-contrast deep slate background, a highlighted sky-blue border, and distinct, larger tactile buttons to make it easily visible over product images.

### Fixed
- Fix scroll position loss on the feed screen when navigating back on Web by introducing state-driven scroll restoration to resolve lifecycle race conditions, removing redundant window event listeners, and restoring the container scroll offset.
- Fix empty space and layout shifts below `SmartHeader` when navigating back to screens with different header designs by tracking header heights route-specifically in `LayoutContext`.

## [1.36.0] - 13 july 2026

### Added
- Support the new `product.specs.harvest` field (`wild` or `farm`) across product creation, editing, and detail screens, including a segmented selector in editable forms and a chip in product cards.
- Display the harvest type alongside caliber and origin chips on feed, business, and dashboard product cards.

### Removed
- Remove Arabic (`ar`) and French (`fr`) language support and translations; the app now supports English (`en`), Tunisian Latin (`tn_latn`), and Tunisian Arabic (`tn_arab`).

### Changed
- Replace the generic options icon with self-explicative fish icons for caliber chips; the icon scales with the caliber value so larger fish indicate larger sizes, and sizing is centralized via `getCaliberIconSize` in `products.helpers.ts`.
- Redesign the Updates screen with a modern, theme-driven UI: side-by-side version comparison cards with a centered action arrow and an environment badge in the section header, consistent icon-only action buttons, and unified responsive button sizing.
- Show the target version label inside the Updates screen download and install action buttons.
- Only render the Updates screen install button when an installable APK file is available.
- Replace native confirmation alerts on the Updates screen with the shared `SmartModal` for download prompts.

## [1.34.5] - 12 july 2026

### Added
- Create dedicated `BusinessDashboardProductDetailScreen` for business owners, allowing section-by-section product editing on the dashboard details route.
- Add support for inline save/cancel actions in `ProductSpecsSection` and `ProductGallerySection` components.
