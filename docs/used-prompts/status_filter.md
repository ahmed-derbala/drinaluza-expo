# Implement SmartStatusFilter Component

Create a reusable **SmartStatusFilter** component for the Expo project that can be used on Sales, Purchases, and any future screen requiring status-based filtering.

## Goals

- Mobile-first design.
- Works on Android, iOS, and Web.
- Fully reusable.
- URL-driven state using Expo Router.
- Supports server-side filtering.
- Supports cached data.
- Smooth animations.
- Theme-aware.
- High performance.

---

## Component API

```tsx
<SmartStatusFilter
    value={status}
    options={statusOptions}
    onChange={handleStatusChange}
/>
```

Example options:

```ts
[
    {
        value: 'all',
        label: 'All',
    },
    {
        value: 'pending_business_confirmation',
        label: 'Pending',
        count: 12,
    },
    {
        value: 'ready_for_pickup_by_customer',
        label: 'Ready',
        count: 5,
    },
]
```

Interface:

```ts
export interface StatusFilterOption {
    value: string
    label: string
    count?: number
    icon?: React.ReactNode
    disabled?: boolean
}
```

---

## UI Requirements

Display a horizontal row of filter chips.

Example:

```
 All   Pending   Accepted   Preparing   Ready   Delivered
```

Requirements:

- Horizontal scrolling.
- Never wrap to multiple rows.
- Automatically scroll selected item into view if necessary.
- Large touch targets.
- Theme-aware colors.
- Rounded chips.
- Optional badge displaying count.
- Optional icon support.
- Selected state clearly visible.

---

## Performance

- Memoize chips.
- Memoize callbacks.
- Avoid unnecessary renders.
- Support 20+ statuses smoothly.
- Use ScrollView unless FlashList provides measurable benefits.

---

## Navigation

The selected status must come from the URL.

Examples:

```
/sales?status=pending

/purchases?status=completed
```

Changing the selected chip must update the URL.

The URL must be the single source of truth.

Do not duplicate this state inside local React state unless absolutely necessary.

Back navigation should preserve the selected filter.

Refreshing the page should preserve the filter.

---

## Backend Integration

The selected status should be passed directly to API requests.

Example:

```
GET /api/sales?status=pending
```

Do not fetch every status and filter client-side unless explicitly configured.

---

## Caching

The cache key must include the selected status.

Example:

```
sales:all

sales:pending

sales:completed
```

Switching filters should reuse cached data whenever available.

If cached data exists:

- display it immediately
- refresh in the background
- replace when new data arrives

---

## Loading State

While changing filters:

- keep current data visible
- show loading indicator
- avoid flashing empty lists
- avoid layout jumps

---

## Empty State

If a status has no items:

Display an appropriate empty state icon without any text.


Do not display an empty screen without context.

---

## Accessibility

Support:

- screen readers
- keyboard navigation on Web
- proper accessibility labels
- sufficient color contrast
- large touch targets

---

## Theming

Do not hardcode colors.

Use the project's theme system.

---

## Reusability

The component must not contain any business-specific logic.

It should work for:

- Sales
- Purchases
- Any future status-based screen

---

## Project Integration

Search the existing project before implementing.

Reuse existing components where possible.

Do not duplicate functionality that already exists.

---

## Code Quality

- Strict TypeScript.
- Well documented props.
- No duplicated code.
- Follow the project's naming conventions.
- Follow existing folder structure.
- Keep the component generic and extensible.

---
