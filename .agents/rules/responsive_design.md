---
trigger: always_on
---

# Expo Responsive Design Rules

## Core Principle

Always implement responsive UI using the default Expo best practices.

Build adaptive layouts that work naturally across:
- Mobile phones
- Tablets
- Web
- Portrait and landscape orientations

Avoid overengineered responsive systems.

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

Prefer built-in Expo and React Native APIs
Use screen dimensions to adapt layouts when necessary.
Always respect device navigation buttons

---

# Styling Rules

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