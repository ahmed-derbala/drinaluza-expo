---
trigger: always_on
---

# Reusable Global Kebab Menu

SmartKebabMenu is a reusable kebab menu that integrates with the existing `SmartScreenHeader`

SmartKebabMenu should be visible in headerRight of SmartScreenHeader on any screen

SmartKebabMenu should has 2 default menu items always shown at the end of the menu:
 - /settings
 - /updates
more menu items should be determined dynamically by the currently displayed screen.

### Architecture

- Do not implement screen-specific menu logic inside `SmartScreenHeader`.
- Create a dedicated reusable module:

```text
src/core/smart-kebab-menu/
├── SmartKebabMenu.tsx
├── SmartKebabMenuProvider.tsx
├── useSmartKebabMenu.ts
├── types.ts
└── index.ts
```

### SmartScreenHeader Integration

- `SmartScreenHeader` must always render the kebab menu button area.

### Dynamic Screen Registration

Each screen must be able to register its own menu items.

When the screen unmounts:

- Automatically unregister its menu items.
- Prevent stale menu entries from remaining visible.

### Menu Item Contract

Create a strongly typed interface:

```ts
export interface SmartKebabMenuItem {
  key: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  destructive?: boolean;

  /**
   * Optional badge.
   * Examples:
   * 3
   * "NEW"
   * "99+"
   */
  badge?: string | number;

  onPress: () => void | Promise<void>;
}
```

### Badge Requirements

- Support numeric badges.
- Support text badges such as:
  - `NEW`
  - `BETA`
  - `99+`
- Badges must be optional.
- Badges should automatically resize based on content.
- Badges must work correctly in dark theme.
- Badges must be accessible.
- Long badge values should be truncated intelligently.
- Badge rendering should not affect menu performance.

### Behavior

- Open when the user presses the kebab menu button.
- Close when:
  - the user selects a menu item
  - the user taps/clicks outside the menu
  - the route changes
  - the screen loses focus
- Support keyboard navigation on web.
- Support dark mode.
- Support mobile and desktop layouts.

### Performance

- Avoid unnecessary re-renders.
- Memoize menu items where appropriate.
- Only update menu state when menu configuration changes.
- Ensure smooth performance on Android, iOS, and Web.

### Future Extensibility

Design the system so future screens can add:

- grouped menu items
- separators
- nested menus
- role-based visibility
- permission-based visibility
- async loading states
- menu item tooltips

without requiring architectural changes.