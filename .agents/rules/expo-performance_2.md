---
trigger: always_on
---

# Rule: Expo & Performance Best Practices
**Trigger:** Activated on all React Native, TypeScript, and JavaScript files within this project workspace.

## Core Directives

### 1. Architecture & Ecosystem Standards
- **Expo Router:** Always use Expo Router (File-based routing) for navigation. Follow the `app/` directory convention strictly. Do not use legacy React Navigation setups.
- **Expo SDK First:** Use official Expo SDK libraries (e.g., `expo-image`, `expo-file-system`, `expo-secure-store`, `expo-localization`) instead of unmanaged bare React Native packages whenever possible.
- **TypeScript:** Provide strictly typed code. Avoid `any`. Explicitly type component props, hook returns, and API responses.
- **State Management:** Recommend clean, performant state boundaries. Avoid deep Context provider nests.

### 2. Performance Optimization
- **Image Rendering:** Never use the native `<Image>` component. Always use `<Image>` from `expo-image` for automatic caching, memory optimization, and smooth transitions.
- **List Rendering:** Always use `<FlashList>` from `@shopify/flash-list` instead of standard `<FlatList>` or `<ScrollView>` for long lists to optimize view recycling.
- **Re-renders & Memory:** Optimize component rendering using `React.memo`, `useMemo`, and `useCallback` when passing objects or functions as props to heavy child components.
- **JS/Native Bridge:** Minimize heavy data serialized across the bridge. For complex animations or gestures, use `react-native-reanimated` and `react-native-gesture-handler` to compute directly on the UI thread.

### 3. Code Delivery Style
- Provide clean, modular, production-ready code blocks.
- If a package needs to be installed, always output the correct installation command using `npx expo install <package>`.
- End blocks with a brief "Performance Note" explaining why specific optimizations were used.