# Implement Backend Availability Detection Using Socket.IO

## Goal

Use the existing Socket.IO connection to determine backend availability.

Do **not** rely on device internet connectivity as the primary source of truth. A device may have internet access while the backend server is down, unreachable, or responding slowly.

The application should distinguish between:

- Device has internet but backend is unreachable.
- Backend is temporarily slow to respond.
- Backend is available.

The Socket.IO connection should represent the backend health.

---

## Connection State

Create a global connection state service.

```ts
type BackendState =
  | 'connecting'
  | 'online'
  | 'offline'
```

The current backend state should be available throughout the application.

---

## Socket.IO

Use the existing Socket.IO client.

Update the backend state using Socket.IO events.

| Event | Backend State |
|--------|---------------|
| `connect` | `online` |
| `disconnect` | `connecting` |
| `connect_error` | `offline` |
| `reconnect_attempt` | `connecting` |
| `reconnect_failed` | `offline` |
| `reconnect` | `online` |

Requirements:

- Keep automatic reconnection enabled.
- Maintain a single Socket.IO connection for the entire application.
- The socket should have only one owner.

---

## API Requests

All GET requests should follow the same behavior.

### Backend Online

- Perform the request normally.

### Backend Connecting

- Immediately load cached data if available.
- Continue waiting for the server response.
- Do not immediately display an error.

### Backend Offline

- If cached data exists:
  - Display cached data.
  - Skip unnecessary network requests.
- Automatically retry once the backend becomes available again.

---

## Slow Backend

Support slow server responses.

Example flow:

1. Request starts.
2. Cached data is displayed immediately (if available).
3. the refresh button in SmartHeader is spinning
4. If the request eventually succeeds:
   - Update the UI.
   - Update the cache.

Never replace cached content with an error simply because the server is slow.

---

## Automatic Refresh

Whenever the backend state changes:

```
offline → online
```

or

```
connecting → online
```

Automatically refresh all **currently mounted** screens.

Do **not** refresh screens that are not mounted.

---

## Cache

Use the existing storage module.

Requirements:

- Always prefer cached data when the backend is unavailable.
- Never clear cached data because of a failed request.
- Update the cache whenever fresh data is received.

---

## UI

Expose the backend state globally.

change icon of refresh button in Smartheader:

- Online: existing refresh icon
- Connecting: refresh icon spinning
- Offline: red cloud-offline icon

The application should remain usable while offline whenever cached data exists.

---

## Architecture

Individual screens must **not** subscribe directly to Socket.IO.

Use the following architecture:

```
Socket.IO
      │
      ▼
ConnectionService
      │
      ▼
Global State / Context
      │
      ▼
Hooks
      │
      ▼
Screens
```

The connection service should be the single source of truth for backend availability.

---

## Health Detection

Do not rely solely on Socket.IO events.

The connection service should combine multiple signals:

### Socket.IO

- Connected → backend is likely reachable.
- Disconnected → backend may be unavailable.

### API Requests

- Any successful API request should immediately mark the backend as **online**.
- Repeated request timeouts or connection failures should transition the backend to **offline**, even if the socket has not yet disconnected.

Use the following state machine:

```
ONLINE
   │
Socket disconnect
   ▼
CONNECTING
   │
   ├──────────────► ONLINE
   │      Socket reconnect
   │      or successful API request
   │
Repeated request timeouts
or connect_error
   ▼
OFFLINE
   │
Socket reconnect
or successful API request
   ▼
ONLINE
```

This prevents false positives where the Socket.IO connection remains open while the REST API is overloaded or temporarily unresponsive.

---

## Code Quality

- Reuse the existing Socket.IO client.
- Reuse the existing storage module.
- Avoid duplicate connection logic.
- Centralize backend availability detection inside a single service.
- Keep UI components focused on rendering.
- Keep networking logic outside of components.
- Strongly type everything with TypeScript.
- Do not break existing API interfaces.
- Design the solution so future screens automatically benefit from backend availability detection without additional implementation.
