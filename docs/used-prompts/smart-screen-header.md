Create a reusable shared screen header component named `SmartScreenHeader` that supports both mobile and web.

Requirements:
- Create reusable component in:
  src/core/smart-screen-header/
- Must use:
  - expo-router best practices

Features:
- Layout:
  - left section
    - Back button: navigates to /feed if no previous screen
    - Title
    - Optional subtitle
  - right section:
    - SmartKebabMenu: always visible, default menu items: /settings and /updates
    - Additional screen-specific headerActions
- Must support:
  - custom actions/icons
  - loading state
  - responsive web/mobile layout
  - safe area handling
- example of Core Props to support:
  - showBackButton
  - onBackPress
  - title
  - subtitle
  - headerActions
  - SmartKebabMenuItems
- Header height and spacing must be consistent across the app.
- The component must:
  - avoid unnecessary rerenders
  - use memoization where useful
  - support theme colors
  - work correctly on Android, iOS, and web
  - handle long titles gracefully
  - avoid layout shift when right actions differ between screens
- Do not hardcode header icons directly inside screens.
- Header actions must be reusable across screens.
- Use composition instead of massive prop-based configuration.
- Ensure implementation follows production-quality architecture.