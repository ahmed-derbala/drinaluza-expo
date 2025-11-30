# Error Handling System

This document describes the improved error handling system implemented in the application.

## Overview

The error handling system provides:
- **User-friendly error messages** instead of technical jargon
- **Visual feedback** through Toast notifications
- **Retry functionality** for recoverable errors
- **Detailed logging** in development mode
- **Categorized errors** (network, server, client, timeout, unknown)

## Components

### 1. Error Handler Utility (`src/utils/errorHandler.ts`)

The core error handling utility that provides:

#### `parseError(error: any): ErrorInfo`
Parses any error and returns structured error information:
```typescript
{
  title: string        // User-friendly error title
  message: string      // User-friendly error message
  type: 'network' | 'server' | 'client' | 'timeout' | 'unknown'
  statusCode?: number  // HTTP status code if applicable
  canRetry: boolean    // Whether the operation can be retried
}
```

#### `logError(error: any, context?: string): void`
Logs detailed error information in development mode only. Includes:
- Error object details
- Request configuration
- Response data
- Parsed error information

#### `showErrorAlert(error: any, onRetry?: () => void): void`
Shows a native alert dialog with error information and optional retry button.

### 2. Toast Component (`src/components/common/Toast.tsx`)

A beautiful, animated toast notification component with:
- **4 types**: success, error, warning, info
- **Auto-dismiss** after configurable duration (default 4s)
- **Manual dismiss** via close button
- **Retry button** for recoverable errors
- **Smooth animations** (slide in from top)
- **Theme-aware** colors

#### Usage Example:
```tsx
import Toast from '../../components/common/Toast'

function MyComponent() {
  const [showToast, setShowToast] = useState(false)
  const [error, setError] = useState<{ message: string; retry?: () => void } | null>(null)

  return (
    <>
      {/* Your component content */}
      <Toast
        visible={showToast}
        message={error?.message || ''}
        type="error"
        onHide={() => setShowToast(false)}
        onRetry={error?.retry}
      />
    </>
  )
}
```

### 3. API Client Integration (`src/core/api/index.ts`)

The API client automatically logs all errors using `logError()` in the response interceptor. This means:
- All API errors are automatically logged in development
- No need to manually log errors in individual API calls
- Consistent error logging across the application

## Error Types

### Network Errors
- **Trigger**: No internet connection, server unreachable
- **User Message**: "Unable to connect to the server. Please check your internet connection or server settings."
- **Can Retry**: Yes

### Timeout Errors
- **Trigger**: Request takes too long
- **User Message**: "The request took too long. Please check your internet connection and try again."
- **Can Retry**: Yes

### Server Errors (5xx)
- **Trigger**: Server-side issues (500, 502, 503, 504)
- **User Message**: "The server encountered an error. Please try again later."
- **Can Retry**: Yes

### Client Errors (4xx)
- **400**: Invalid request
- **401**: Authentication required
- **403**: Access denied
- **404**: Not found
- **Can Retry**: No (except for specific cases)

## Implementation in Components

### Example: Feed Screen

```tsx
import { parseError, logError } from '../../utils/errorHandler'
import Toast from '../../components/common/Toast'

export default function FeedScreen() {
  const [error, setError] = useState<{ message: string; retry?: () => void } | null>(null)
  const [showToast, setShowToast] = useState(false)

  const fetchFeed = async () => {
    try {
      const response = await getFeed()
      setFeedItems(response.data.data)
      setError(null) // Clear any previous errors
    } catch (err) {
      logError(err, 'fetchFeed')
      const errorInfo = parseError(err)
      setError({
        message: errorInfo.message,
        retry: errorInfo.canRetry ? fetchFeed : undefined
      })
      setShowToast(true)
    }
  }

  return (
    <View>
      {/* Your component content */}
      <Toast
        visible={showToast}
        message={error?.message || ''}
        type="error"
        onHide={() => setShowToast(false)}
        onRetry={error?.retry}
      />
    </View>
  )
}
```

## Best Practices

1. **Always use `parseError()`** to get user-friendly error messages
2. **Use `logError()`** with context for better debugging
3. **Provide retry functionality** for recoverable errors
4. **Clear errors** on successful operations
5. **Use Toast** for non-blocking notifications
6. **Use Alert** for critical errors that require user attention

## Benefits

✅ **Better UX**: Users see friendly messages instead of technical errors
✅ **Faster debugging**: Detailed logs in development mode
✅ **Consistent handling**: Same error handling pattern across the app
✅ **Retry capability**: Users can retry failed operations easily
✅ **Clean code**: Less boilerplate error handling code
✅ **Type-safe**: Full TypeScript support

## Migration Guide

To migrate existing error handling:

**Before:**
```tsx
try {
  const response = await getFeed()
  setData(response.data)
} catch (error) {
  console.error('Failed to fetch feed:', error)
}
```

**After:**
```tsx
try {
  const response = await getFeed()
  setData(response.data)
  setError(null)
} catch (err) {
  logError(err, 'fetchFeed')
  const errorInfo = parseError(err)
  setError({
    message: errorInfo.message,
    retry: errorInfo.canRetry ? fetchFeed : undefined
  })
  setShowToast(true)
}
```
