---
trigger: always_on
---

# general rules

## backend (./drinaluza-expressjs/)
- do not edit the backend project 
- you can read only the backend project

## read-only files and directories
- package-lock.json
- docs/used-prompts

## UI

### cards
- all cards must be based on BaseCard
- a card must be implemented on its own file

### theme
- never hardcode colors or constants. use the core/theme/ instead

### buttons
- all buttons must be based on IconButton (icon only) or TextButton (text only) or IconTextButton (icon + text)
- a button should be on its own file



## cleanup
Improve code quality, maintainability, consistency, and bundle size without changing application behavior.

## refactoring
- when an object name is changed, update the object name wherever it is used. dont use ```export const oldName = newName ```

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

### 2. Remove unused dependencies

Inspect:
- package.json
Remove packages that are no longer used.
If removing a package requires code changes, perform them safely.

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

### 4. Reusable functions

If the same function or nearly identical implementation exists in multiple places:
Move it into an appropriate shared location.
Import it wherever needed.
Never duplicate identical logic.

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































always apply rules from
    .agents/rules/

never deletes files from
    docs/used-prompts/


