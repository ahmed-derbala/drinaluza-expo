---
trigger: always_on
---

# Rule: Prevent Keyboard Overlapping on Input Fields

When building or modifying forms, inputs, or text fields, always make sure the keyboard never overlaps the active text input

## Goal

On mobile portrait mode, whenever the user focuses an input field and the keyboard opens, the focused input must always remain visible above the keyboard so the user can clearly see what they are typing.

---

# Requirements

- Never allow the virtual keyboard to overlap the currently focused input field.
- Automatically scroll the screen when needed so the focused input stays visible.
- Support both Android and iOS.
- Handle small screens correctly.
- Ensure forms work correctly inside:
  - ScrollView
  - FlatList
  - Modal
  - Bottom Sheet
  - Tabs
  - Nested layouts

---

# Implementation Rules

## Use keyboard-aware containers

Prefer:
- `KeyboardAvoidingView`
- `react-native-keyboard-aware-scroll-view`
- Expo-compatible keyboard handling solutions

Avoid custom fragile hacks unless absolutely necessary.

---

# Preferred Advanced Solution

For large forms or production-grade UX, use:

```bash
react-native-keyboard-aware-scroll-view
```

---

# Android Requirements

Ensure Android activity uses:

```json
"softwareKeyboardLayoutMode": "resize"
```

inside Expo app configuration when appropriate.

Example:

```json
{
  "expo": {
    "android": {
      "softwareKeyboardLayoutMode": "resize"
    }
  }
}
```

Avoid `"pan"` because it can create broken layouts.

---

# UX Rules

- Add enough bottom padding so the last input is still reachable above the keyboard.
- When validation errors appear, keep the focused input visible.
- Smoothly animate layout changes when keyboard opens/closes.
- Do not cause layout jumping or flickering.
- Preserve scroll position correctly.

---

# AI Agent Constraints

- Reuse a centralized keyboard-safe layout wrapper component across the project.
- Do not implement different keyboard behaviors per screen unless necessary.
- Do not allow hidden submit buttons behind the keyboard.
- Test on:
  - Android portrait
  - iPhone portrait
  - Small screen devices
  - Long forms
  - Modal forms

---

# Recommended Shared Component

Create reusable component in src/core/KeyboardSafeView/

```tsx
<KeyboardSafeView>
```

and use it on all screens containing input fields.