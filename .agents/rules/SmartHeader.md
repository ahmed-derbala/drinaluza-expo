---
trigger: always_on
---

you are a senior expo developer. produce production level code quality
every screen uses SmartHeader located in src/core/smart-header/

- Layout:
  - left section
    - Back button: navigates to /feed if no previous screen
    - Title
    - Optional subtitle
  - right section:
    - SmartKebabMenu: always visible, default menu items: /settings and /updates
    - headerActions: Container for screen-specific action buttons.
- example of Core Props to support:
  - showBackButton
  - onBackPress
  - title
  - subtitle
  - headerActions
  - SmartKebabMenuItems
  - isLoading
- Rules:
  - apply expo-router best practices
  - Do not hardcode headerActions directly inside screens.
  - HeaderActions must be reusable across screens.
  - Zero Layout Shift: Ensure the right section has a stable container size or proper flex alignment so that switching between screens with different numbers of `headerActions` does not cause visual layout shifts or "jumps" in the header.  
  - responsive web and mobile layout
  - hide when scroll down
- Dynamic Loading & Animation State:
  - Title Animation Replacement: When `isLoading` is `true`, replace the `Title` and `Subtitle` text with an animated placeholder/skeleton loader (e.g., a pulsing Moti view, an Animated.View, or a subtle skeleton block).
  - Layout Preservation: The animated placeholder must occupy the exact same layout boundaries (height/width constraints) as the expected title text to completely prevent visual layout shifts when `isLoading` toggles to `false` and the real title fades in.