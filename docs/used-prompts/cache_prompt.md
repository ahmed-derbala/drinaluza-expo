# Specification: Offline-First Caching Layer for Expo

This document outlines the architectural requirements and implementation rules for building an offline-first caching layer within the Expo application.

---

## ## Goal

The primary objective is to ensure the application remains highly responsive, presenting useful data immediately and minimizing loading screens.

* **Immediate Display:** Always attempt to display cached data instantly while a network request runs in the background.
* **Background Updates:** When a background network request succeeds, seamlessly update both the UI and the cache.
* **Offline Resilience:** If a network request fails, continue displaying cached data instead of showing an error state.
* **Optimized UX:** The user should experience minimal loading spinners or blocking screens.

---

## ## Storage Constraints

To maintain a clean architecture, all cache transactions must go through our centralized storage system:

* **Encapsulation:** Use the existing **storage module** for all cache operations.
* **No Direct Access:** Do not access `AsyncStorage`, `SecureStore`, `MMKV`, or any other low-level storage implementation directly within your features or UI components.
* **Extensibility:** If the current storage module lacks required methods, extend the storage module itself rather than bypassing it.

---

## ## General Rules

Apply these rules systematically to every **GET** endpoint:

1. **Immediate Read:** Read from the local cache immediately.
2. **Parallel Execution:** * If cached data exists, render it immediately and mark it as *cached/stale* internally.
* Simultaneously, kick off the API request in parallel.


3. **On Success:** * Update the UI with the fresh data.
* Overwrite the old cached data.
* Clear any internal "stale" flags.


4. **On Failure:** * Keep displaying the cached data.
* *Never* clear or remove cached data because of a network failure.
* Only show a red "cloud-offline" icon in the center of the screen if no cached data exists to fall back on.



---

## ## Implementation Flows

### ### Feed Example (`GET /api/feed`)

The diagram below outlines the lifecycle of the feed screen:

```
App Starts
   │
   ▼
Read Cached Feed
   │
   ├─► [If Cache Exists] ──► Display cached feed immediately
   │
   ▼
Request Latest Feed (API)
   │
   ├─► [Request Succeeds] ──► Replace feed with latest server response ──► Update Cache
   │
   └─► [Request Fails] ────► Continue displaying cached feed ──► add a red cloud-offline icon in refresh button in SmartHeader

```

> ⚠️ **Critical:** The feed must never become empty simply because a background network request failed.

### ### Profile Example (`GET /api/users/my-profile`)

* **Step 1:** If a cached profile exists, display it immediately.
* **Step 2:** Fetch the latest profile in the background.
* **Step 3 (Success):** Update the UI and overwrite the cache.
* **Step 4 (Failure):** Keep displaying the cached profile silently and add a red cloud-offline icon in refresh button in SmartHeader

---

## ## Loading States

We distinguish between three distinct loading scenarios to prevent jarring UI flashes:

| Loading State | Condition | UI Behavior |
| --- | --- | --- |
| **Initial Loading** | No cache exists. | Show a centered, spinning loading icon. |
| **Refresh Loading** | Cache exists. | **Do not** show a central spinner. Display cached content while silently refreshing, and spin the refresh button in the `SmartHeader`. |
| **Offline** | Network request fails, but cache exists. | Keep displaying cached data. Do *not* replace content with an error screen. Show a static red cloud-offline icon in the `SmartHeader` refresh button. |

---

## ## Cache Management

### ### Cache Keys

All cache keys must be deterministic and predictable. Do not generate random keys.

* `profile:<userSlug>`
* `product:<productSlug>`
* `business:<businessSlug>`

### ### Cache Expiration (TTL)

The caching layer must support Time-To-Live (TTL). Each cached object must store:

data
cachedAt timestamp

* The storage module must expose helpers to determine if a cache entry is stale.
* *Note:* Stale data should still be displayed to the user while the background refresh occurs.

### ### Cache Invalidation

Whenever a resource is mutated locally (e.g., via `PATCH /product` or `PATCH /profile`):

* **Immediately** update or invalidate the corresponding cached entry so the UI remains consistent.
* Do not wait for a subsequent GET request to trigger the cache update.

---

## ## Error Handling & Edge Cases

Only display a red cloud-offline icon in the center of the screen when:

1. The network request fails.
2. **AND** there is absolutely no cached data available.

In all other scenarios, favor displaying stale/cached data with a red cloud-offline icon in the `SmartHeader` refresh button.

---

## ## Code Quality & Standards

* **TypeScript:** Everything must be strictly typed. Avoid `any`.
* **DRY (Don't Repeat Yourself):** Do not duplicate caching logic across screens. Create reusable hooks, services, or data-layer utilities.
* **Separation of Concerns:** Keep components focused purely on rendering. Place caching, fetching, and TTL evaluation logic in custom hooks or services.
* **Backward Compatibility:** Do not break existing API interfaces or response signatures.
