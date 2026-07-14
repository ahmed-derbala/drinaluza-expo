---
trigger: always_on
---

# Optimize Expo Project

Perform a comprehensive optimization audit and implementation for this Expo project (mobile + web).

## Goals

- Improve startup time
- Reduce bundle size
- Improve navigation performance
- Reduce unnecessary re-renders
- Improve memory usage
- Improve APK/AAB build performance
- Improve web performance
- Maintain existing functionality
- Follow Expo best practices


Review all components and:

- Prevent unnecessary re-renders.
- Use `React.memo` where beneficial.
- Use `useCallback` only when it provides value.
- Use `useMemo` only when it provides value.
- Remove useless memoization.
- Avoid inline functions in frequently rendered lists.
- Avoid creating objects and arrays inside render methods when possible.
- Optimize FlashList and SectionList usage.
- Ensure stable keys are used.

Do not over-optimize.

---

## Navigation Optimization

Review Expo Router implementation.

Verify:

- Correct route structure.
- Lazy loading where appropriate.
- No unnecessary screen remounts.
- Shared layouts are used correctly.
- Shared UI components are not recreated unnecessarily.

Investigate:

- Navigation transitions.
- White flashes.
- Layout flickering.
- Suspense boundaries.
- Loading states.

---

## State Management

Review all state management code.

Ensure:

- State is colocated when appropriate.
- Global state is not used unnecessarily.
- Context providers do not trigger excessive re-renders.
- Large objects are not recreated frequently.
- Derived state is computed efficiently.

---

## Lists and Large Data

Review all:

- SectionList
- FlashList

Optimize:

- keyExtractor
- estimatedItemSize
- windowSize
- initialNumToRender
- maxToRenderPerBatch
- removeClippedSubviews

Use FlashList when beneficial.

---

## Network Optimization
Ensure:

- Request deduplication
- Proper caching
- Background refresh
- Pagination
- Infinite scrolling efficiency
- Retry policies
- Stale time configuration

Avoid unnecessary requests.

---

## Asset Optimization

Review:

- Images
- Fonts
- Icons
- SVGs
- Videos

Ensure:

- Proper image sizing
- Lazy loading
- Asset caching
- Unused assets removed

Identify oversized assets.

---

## Web Optimization

Review:

- Web bundle size
- Route splitting
- Dynamic imports
- Hydration issues
- Large dependencies
- Browser rendering performance

Ensure:

- Dead code is removed.
- Dynamic imports are used where beneficial.

---

## Build Optimization

Review:

### Android

- gradle.properties
- Proguard/R8 configuration
- Hermes configuration
- Build variants

### Expo

- app.config.js
- eas.json
- Metro configuration

Ensure:

- Hermes enabled
- Production optimizations enabled
- Build cache utilized
- Fast local build configuration

---

## Dependency Audit

Review all dependencies.

For each dependency:

- Determine whether it is actually used.
- Identify duplicates.

Remove unused dependencies safely.

---

## Code Quality

Improve:

- Folder structure consistency
- Naming consistency
- Reusability
- Separation of concerns

Do not perform purely cosmetic refactors.

Requirements:

- Preserve existing behavior.
- Avoid premature optimization.
- Follow Expo SDK and Expo Router best practices.