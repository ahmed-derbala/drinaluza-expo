# Search Implementation - Clean Architecture

## Overview

The search functionality has been completely rewritten from scratch with a clean separation of concerns. The search logic is now fully encapsulated in a dedicated `SearchBar` component.

## Architecture

### Components

#### 1. **SearchBar** (`src/components/search/SearchBar.tsx`)
A self-contained search component that handles:
- Text input management
- Debounced search (500ms)
- API calls to search endpoint
- Error handling
- Clear functionality
- State management (internal)

**Props:**
```typescript
interface SearchBarProps {
  onSearchResults: (results: FeedItem[]) => void  // Called when search returns results
  onSearchClear: () => void                        // Called when search is cleared
  onError?: (message: string, retry?: () => void) => void  // Called on error
}
```

**Features:**
- ✅ Self-contained state management
- ✅ Built-in debouncing (500ms)
- ✅ Automatic error handling
- ✅ Clear button
- ✅ Theme-aware styling
- ✅ No focus loss issues

#### 2. **FeedScreen** (`src/app/home/feed.tsx`)
Simplified screen that:
- Fetches and displays feed items
- Integrates SearchBar component
- Handles search results via callbacks
- Manages display state (feed items vs search results)

**State Management:**
```typescript
const [feedItems, setFeedItems] = useState<FeedItem[]>([])        // Original feed data
const [displayedItems, setDisplayedItems] = useState<FeedItem[]>([])  // What's shown (feed or search)
const [isSearchActive, setIsSearchActive] = useState(false)       // Track if searching
```

## Data Flow

```
User types in SearchBar
    ↓
SearchBar debounces input (500ms)
    ↓
SearchBar calls searchFeed API
    ↓
SearchBar calls onSearchResults(results)
    ↓
FeedScreen updates displayedItems
    ↓
FlatList shows search results
```

## Key Improvements

### 1. **No Focus Loss**
The SearchBar component manages its own state internally. The parent (FeedScreen) doesn't re-render when typing, so the TextInput maintains focus.

### 2. **Clean Separation**
- **SearchBar**: Handles all search logic, debouncing, API calls
- **FeedScreen**: Handles display logic, data management

### 3. **Simple Integration**
```tsx
<SearchBar
  onSearchResults={handleSearchResults}
  onSearchClear={handleSearchClear}
  onError={handleSearchError}
/>
```

### 4. **Reusable**
The SearchBar component can be used in any screen that needs search functionality.

## Usage Example

### In any screen:

```tsx
import SearchBar from '../../components/search/SearchBar'

function MyScreen() {
  const [results, setResults] = useState<FeedItem[]>([])
  
  return (
    <View>
      <SearchBar
        onSearchResults={(items) => setResults(items)}
        onSearchClear={() => setResults([])}
        onError={(msg, retry) => console.error(msg)}
      />
      {/* Display results */}
    </View>
  )
}
```

## Implementation Details

### SearchBar Internal Logic

1. **Text Change Handler**
   ```tsx
   const handleTextChange = (text: string) => {
     setSearchText(text)
     clearTimeout(timer)
     
     if (!text.trim()) {
       onSearchClear()
       return
     }
     
     timer = setTimeout(() => performSearch(text), 500)
   }
   ```

2. **Search Execution**
   ```tsx
   const performSearch = async (text: string) => {
     try {
       const response = await searchFeed(text, 'en', ['products'])
       onSearchResults(response.data.data)
     } catch (err) {
       onError(errorMessage, retry)
     }
   }
   ```

3. **Clear Handler**
   ```tsx
   const handleClear = () => {
     setSearchText('')
     clearTimeout(timer)
     onSearchClear()
   }
   ```

### FeedScreen Integration

1. **Callback Handlers**
   ```tsx
   const handleSearchResults = useCallback((results: FeedItem[]) => {
     setIsSearchActive(true)
     setDisplayedItems(results)
   }, [])

   const handleSearchClear = useCallback(() => {
     setIsSearchActive(false)
     setDisplayedItems(feedItems)
   }, [feedItems])
   ```

2. **Display Logic**
   ```tsx
   // Always show displayedItems (either feed or search results)
   <FlatList data={displayedItems} ... />
   ```

## Benefits

✅ **No Focus Issues**: SearchBar manages its own state
✅ **Clean Code**: Clear separation of concerns
✅ **Reusable**: Can be used in multiple screens
✅ **Maintainable**: Easy to understand and modify
✅ **Type-Safe**: Full TypeScript support
✅ **Error Handling**: Built-in error handling with retry
✅ **Performance**: Debounced search prevents excessive API calls

## Testing

To test the search functionality:

1. **Basic Search**
   - Type in the search bar
   - Wait 500ms
   - Results should appear

2. **Clear Search**
   - Click the X button
   - Should show original feed

3. **Empty Search**
   - Delete all text
   - Should immediately show original feed

4. **Error Handling**
   - Disconnect from server
   - Type in search
   - Should show error toast with retry option

5. **Focus Maintenance**
   - Type multiple characters continuously
   - Input should maintain focus throughout

## Files

### Created:
- ✅ `src/components/search/SearchBar.tsx` - New search component

### Modified:
- ✅ `src/app/home/feed.tsx` - Completely rewritten

### Deleted:
- ✅ `src/components/common/SearchInput.tsx` - Old implementation

## Migration Notes

The old implementation had:
- Search logic mixed with FeedScreen
- Complex state management
- Focus loss issues
- Difficult to maintain

The new implementation:
- Clean separation of concerns
- Simple callback-based communication
- No focus issues
- Easy to maintain and extend
