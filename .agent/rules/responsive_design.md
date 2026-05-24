---
trigger: always_on
---

# Expo Responsive Design Rules

## Core Principle

Always implement responsive UI using the default Expo and React Native best practices.

Build adaptive layouts that work naturally across:
- Mobile phones
- Tablets
- Web
- Portrait and landscape orientations

Avoid overengineered responsive systems unless explicitly required.

---

# Required Responsive Practices

## Layout System

Always prefer:
- Flexbox layouts
- Adaptive containers
- Percentage/flex sizing
- Natural content flow

Use:
- `flex`
- `flexDirection`
- `alignItems`
- `justifyContent`
- `flexWrap`
- `gap`

Avoid:
- Fixed pixel dimensions
- Absolute positioning for layouts
- Hardcoded screen assumptions

---

# Responsive APIs

Prefer these built-in React Native APIs:

```tsx
import { useWindowDimensions } from 'react-native'
```

```tsx
const { width, height } = useWindowDimensions()
```

Use screen dimensions to adapt layouts when necessary.

Example:

```tsx
const isTablet = width >= 768
```

```tsx
<View
  style={{
    flexDirection: isTablet ? 'row' : 'column',
  }}
>
```

---

# Safe Areas

Always respect device safe areas.

Avoid layouts that overlap:
- Notches
- Status bars
- Navigation gestures

---

# Scrolling

Use:
- `ScrollView`
- `FlatList`
- `SectionList`

correctly for smaller screens and dynamic content.

Avoid:
- Non-scrollable long screens
- Nested scroll containers unless necessary

---

# Styling Rules

Prefer:

```tsx
StyleSheet.create()
```

Avoid:
- Large inline style objects
- Repeated style definitions
- CSS-heavy approaches

---

# Mobile First

Design mobile-first.

Then progressively adapt layouts for:
- Tablets
- Web

Do not design desktop-first unless explicitly requested.

---

# Expo Router Rules

Use Expo Router layouts correctly.

Prefer:
- `_layout.tsx`
- Nested layouts
- Shared responsive navigation structures

Avoid:
- Duplicating screens for tablet/web
- Separate navigation systems per platform

---

# Web Responsiveness

For Expo Web:
- Let Flexbox handle most responsiveness
- Prefer adaptive spacing
- Prefer fluid layouts

Avoid:
- Excessive media queries
- Complex CSS breakpoint systems
- Web-only hacks unless necessary

---

# Performance Rules

Keep responsive logic lightweight.

Avoid:
- Constant dimension recalculations
- Heavy responsive libraries
- Deep conditional rendering trees

Prefer:
- Memoized calculations
- Reusable responsive hooks
- Simple adaptive patterns

---

# Architecture Constraints

Apply these rules automatically to:
- All screens
- Components
- Layouts
- Navigation structures

unless explicitly overridden.

Always prefer the native Expo + React Native way before introducing third-party responsive solutions.

Treat these rules as architectural constraints for the entire codebase and apply them automatically in every generated screen/component unless explicitly overridden.