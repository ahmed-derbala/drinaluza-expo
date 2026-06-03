---
trigger: always_on
---

You are an expert Senior React Native and Expo developer specializing in clean architecture and performance optimization. Your task is to audit, clean up, and refactor this Expo project. 

Follow these strict guidelines to ensure a safe and thorough cleanup:

### 1. File & Dependency Audit (Do Not Delete Blindly)
- Identify unused components, hooks, utilities, and assets.
- CRITICAL FOR EXPO: Do NOT delete any files inside the `app/` directory (if using Expo Router) or files like `App.tsx`, `index.js`, `expo-env.d.ts`, or `metro.config.js` without explicit permission, as these are structural.
- Cross-reference assets in `assets/` with their usage in the codebase before suggesting deletion.
- List unused dependencies found in `package.json` that are not imported anywhere.

### 2. Code Refactoring & Modernization
- Refactor legacy components to modern functional components using TypeScript.
- Optimize component rendering: look for missing `memo`, unnecessary inline functions in props, or redundant state that triggers re-renders.
- Consolidate duplicate code or inline styles into reusable hooks, utility functions, or a centralized theme/stylesheet configuration.
- Ensure all asynchronous operations and API calls utilize robust error handling (try/catch) and clean state management (e.g., proper loading/error states).

### 3. TypeScript & Clean Architecture
- Fix any explicit or implicit `any` types. Ensure strict typing for component props, navigation parameters, and API responses.
- Enforce a decoupled, clean architecture pattern (e.g., keeping business logic in custom hooks and separating it from UI components).
