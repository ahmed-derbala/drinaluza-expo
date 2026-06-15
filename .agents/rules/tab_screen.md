---
trigger: always_on
---

## Tab Screen Data Fetching Rules

When implementing screens with tabs in this Expo project:

- Each tab must own its own data fetching logic and state.
- Switching tabs must NOT refresh or rerender unrelated tabs.
- Refresh only the currently active tab data.
- Preserve inactive tab state whenever possible.
- Avoid parent-level fetching that causes all tabs to rerender.
- Use lazy loading for tabs when appropriate.
- Refetch data only when:
  - the active tab is focused,
  - pull-to-refresh is triggered,

Preferred patterns:
- expo-router tabs or material top tabs
- React.memo for expensive tab components
- useFocusEffect only inside the relevant tab
- Separate query keys per tab
- Keep tab content isolated

Avoid:
- Global screen refresh on tab change
- Parent component owning all tab data
- useEffect tied to selectedTab that refetches everything
- Unnecessary rerenders across tabs