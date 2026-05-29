Create a reusable shared screen header component named `SmartScreenHeader` that supports both mobile and web.

Requirements:

- Component path:
  src/core/SmartScreenHeader/

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
  - accessibility
  - keyboard navigation on web
  - hover effects on web
  - proper touch targets on mobile

- Props should include:
  - title
  - subtitle
  - leftContent
  - rightContent
  - onBackPress
  - showBackButton
  - loading
  - transparent
  - sticky
  - className
  - style

- Header height and spacing must be consistent across the app.

- The component must:
  - avoid unnecessary rerenders
  - use memoization where useful
  - support theme colors
  - work correctly on Android, iOS, and web
  - handle long titles gracefully
  - avoid layout shift when right actions differ between screens

- Create reusable shared header action components:
  - `SmartHeaderIconButton`
  - `SmartBackButton`

`SmartHeaderIconButton` requirements:
- supports any icon library
- hover effect on web
- ripple/press feedback on mobile
- accessibility label
- loading/disabled state
- badge count support
- configurable size
- proper hitSlop

- Do not hardcode icons directly inside screens.
- Header actions must be reusable across screens.

- Use composition instead of massive prop-based configuration.

- Ensure implementation follows production-quality architecture.