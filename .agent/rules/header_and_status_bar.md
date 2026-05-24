---
trigger: always_on
---

## Header and Status Bar Rules

Fix excessive spacing between the device status bar and screen headers.

Requirements:

- Use Expo Router + React Navigation default header behavior.
- Do NOT add manual `paddingTop` for status bar spacing.
- Avoid stacking multiple safe-area containers.
- Only one top-level `SafeAreaProvider` should exist in the app.
- Prefer `react-native-safe-area-context` over custom status bar spacing.
- If using a custom header:
  - use `useSafeAreaInsets()`
  - apply ONLY `paddingTop: insets.top`
  - do not add extra fixed top spacing
- Do not wrap every screen with additional `SafeAreaView` unless necessary.
- Keep header spacing visually identical across screens.
- Verify behavior on:
  - Android
  - iOS
  - Web

Check for duplicated spacing from:
- SafeAreaView
- contentContainerStyle
- Stack header
- custom Header component
- StatusBar configuration

Use Expo and Expo Router best practices.