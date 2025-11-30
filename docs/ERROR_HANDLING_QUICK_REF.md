# Quick Reference: Error Handling

## Import Statements

```tsx
import Toast from '../../components/common/Toast'
import { parseError, logError } from '../../utils/errorHandler'
```

## State Setup

```tsx
const [error, setError] = useState<{ message: string; retry?: () => void } | null>(null)
const [showToast, setShowToast] = useState(false)
```

## Error Handling Pattern

```tsx
const fetchData = async () => {
  try {
    const response = await apiCall()
    setData(response.data)
    setError(null) // ✅ Clear errors on success
  } catch (err) {
    logError(err, 'fetchData') // 🐛 Log in dev mode
    const errorInfo = parseError(err) // 📝 Parse to user-friendly message
    setError({
      message: errorInfo.message,
      retry: errorInfo.canRetry ? fetchData : undefined // 🔄 Add retry if possible
    })
    setShowToast(true) // 📢 Show toast
  }
}
```

## Toast Component

```tsx
<Toast
  visible={showToast}
  message={error?.message || ''}
  type="error"
  onHide={() => setShowToast(false)}
  onRetry={error?.retry}
/>
```

## Toast Types

```tsx
type="success"  // ✅ Green
type="error"    // ❌ Red
type="warning"  // ⚠️  Orange
type="info"     // ℹ️  Blue
```

## Error Messages by Type

| Error Type | User Message | Can Retry |
|------------|--------------|-----------|
| Network | "Unable to connect to the server..." | ✅ Yes |
| Timeout | "The request took too long..." | ✅ Yes |
| Server (5xx) | "The server encountered an error..." | ✅ Yes |
| 400 | "The request was invalid..." | ❌ No |
| 401 | "Please log in to continue." | ❌ No |
| 403 | "You do not have permission..." | ❌ No |
| 404 | "The requested resource was not found." | ❌ No |

## Complete Example

```tsx
import React, { useState } from 'react'
import { View, Button } from 'react-native'
import Toast from '../../components/common/Toast'
import { parseError, logError } from '../../utils/errorHandler'
import { getFeed } from '../../components/feed/feed.api'

export default function MyScreen() {
  const [data, setData] = useState([])
  const [error, setError] = useState<{ message: string; retry?: () => void } | null>(null)
  const [showToast, setShowToast] = useState(false)

  const fetchData = async () => {
    try {
      const response = await getFeed()
      setData(response.data.data)
      setError(null)
    } catch (err) {
      logError(err, 'fetchData')
      const errorInfo = parseError(err)
      setError({
        message: errorInfo.message,
        retry: errorInfo.canRetry ? fetchData : undefined
      })
      setShowToast(true)
    }
  }

  return (
    <View>
      <Button title="Load Data" onPress={fetchData} />
      
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

## Tips

✅ **DO:**
- Always clear errors on success: `setError(null)`
- Use `logError()` with context for debugging
- Provide retry for recoverable errors
- Use Toast for non-blocking notifications

❌ **DON'T:**
- Don't use `console.error()` directly (use `logError()`)
- Don't show technical error messages to users
- Don't forget to handle the retry function
- Don't block the UI with alerts for minor errors
