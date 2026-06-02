Create a reusable shared screen header component named `SmartScreenHeader` that supports both mobile and web.

Requirements:

- Create reusable component in:
  src/core/smart-screen-header/

- Must use:
  - expo-router compatible patterns
  - TypeScript

Features:

- Display:
  - optional left section
  - centered title
  - optional subtitle
  - optional right section

- Must support:
  - back button
  - custom actions/icons
  - loading state
  - responsive web/mobile layout
  - safe area handling
  - keyboard navigation on web
  - hover effects on web
  - proper touch targets on mobile

- Core Props to support:
  - title
  - subtitle
  - headerLeft
  - headerRight
  - onBackPress
  - showBackButton
  - loading

- Header height and spacing must be consistent across the app.

- The component must:
  - avoid unnecessary rerenders
  - use memoization where useful
  - support theme colors
  - work correctly on Android, iOS, and web
  - handle long titles gracefully
  - avoid layout shift when right actions differ between screens
  - if there is no previous screen, the back button should open /feed

- Do not hardcode header icons directly inside screens.
- Header actions must be reusable across screens.

- Use composition instead of massive prop-based configuration.

- Ensure implementation follows production-quality architecture.