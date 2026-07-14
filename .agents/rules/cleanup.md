---
trigger: always_on
---

# Project Cleanup & Refactoring

Perform a complete cleanup and refactoring of the Expo project.

## Goals

Improve code quality, maintainability, consistency, and bundle size without changing application behavior.

---

## Requirements

### 1. Remove dead code

Delete:

- Unused files
- Unused components
- Unused hooks
- Unused utilities
- Unused screens
- Unused assets
- Unused images
- Unused icons
- Unused fonts
- Unused constants
- Unused types/interfaces
- Unused styles
- Unused functions
- Unused variables
- Unused imports
- Unused exports

Do NOT remove anything referenced dynamically.

---

### 2. Remove unused dependencies

Inspect:

- package.json

Remove packages that are no longer used.

If removing a package requires code changes, perform them safely.

---

### 3. Remove duplicated logic

Whenever similar logic appears multiple times:

- Extract it into:
  - utility
  - helper
  - custom hook
  - reusable component
  - service
  - shared constant

Choose the most appropriate abstraction.

Avoid copy-paste code.

---

### 4. Reusable functions

If the same function or nearly identical implementation exists in multiple places:

Move it into an appropriate shared location.

Import it wherever needed.

Never duplicate identical logic.

---

### 5. Reusable UI

Extract repeated UI into reusable components.

Examples:

- Cards
- Buttons
- Dialogs
- Modals
- Headers
- List items
- Empty states
- Loading states

---

### 6. Refactor

Improve:

- Naming
- Readability
- Folder organization
- File organization
- Function size
- Component size
- Separation of concerns

Split overly large files into smaller focused modules.

---

### 7. Simplify code

Replace unnecessarily complex code with simpler implementations while preserving behavior.

Remove:

- nested conditions
- duplicated state
- redundant effects
- unnecessary renders
- unnecessary memoization
- dead branches

---

### 8. Type safety

Improve TypeScript:

- remove any where possible
- reuse existing types
- remove duplicated interfaces
- improve generic usage
- improve inferred types

---

### 9. Imports

Organize imports consistently.

Remove:

- duplicate imports
- unused imports
- circular imports if possible

---

### 10. Performance

Improve performance where safe.

Examples:

- avoid unnecessary renders
- memoize expensive computations only when beneficial
- remove unnecessary useEffect
- reduce unnecessary object recreation

Do not over-optimize.

---

### 11. Preserve behavior

Do NOT change:

- business logic
- navigation
- API contracts
- UI appearance unless fixing obvious inconsistencies

The application should behave the same.

---

### 12. Verification

Before deleting anything, verify that it is truly unused.

Consider:

- Expo Router
- dynamic imports
- lazy loading
- context providers
- barrel exports
- runtime references

Do not remove code that may be referenced indirectly.
