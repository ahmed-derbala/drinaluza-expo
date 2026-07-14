# Smart Modal

A modular, cross-platform modal component system for React Native (web and mobile). Built with Expo Router theming support and platform-specific optimizations.

## Features

- **Three modal variants**: Centered, Bottom Sheet, and Fullscreen
- **Cross-platform**: Works seamlessly on web, iOS, and Android
- **Theme integration**: Automatically uses your Expo Router theme
- **Platform-aware**: Handles Android back button, web interactions, and native animations
- **Responsive design**: Uses flexbox and percentage-based sizing for natural adaptation
- **Customizable**: Flexible props for headers, footers, and content
- **Type-safe**: Full TypeScript support

## Installation

The modal components are located in `@/core/smart-modal`. Import them directly:

```tsx
import { SmartModal, CenteredModal, BottomSheetModal, FullscreenModal } from '@/core/smart-modal'
```

## Components

### SmartModal (Base Component)

The base modal with all features. Use this when you need maximum control.

```tsx
import { SmartModal } from '@/core/smart-modal'

<SmartModal
  visible={isVisible}
  onClose={() => setIsVisible(false)}
  variant="centered"
  title="Modal Title"
  subtitle="Optional subtitle"
>
  <YourContent />
</SmartModal>
```

### CenteredModal

A centered modal that appears in the middle of the screen. Best for alerts, confirmations, and focused interactions.

```tsx
import { CenteredModal } from '@/core/smart-modal'

<CenteredModal
  visible={isVisible}
  onClose={() => setIsVisible(false)}
  title="Confirm Action"
  maxWidth={400}
>
  <Text>Are you sure you want to proceed?</Text>
</CenteredModal>
```

### BottomSheetModal

A bottom sheet that slides up from the bottom. Best for pickers, filters, and mobile-optimized lists.

```tsx
import { BottomSheetModal } from '@/core/smart-modal'

<BottomSheetModal
  visible={isVisible}
  onClose={() => setIsVisible(false)}
  title="Select Option"
>
  <YourPickerContent />
</BottomSheetModal>
```

### FullscreenModal

A fullscreen modal that takes up the entire screen. Best for complex forms, multi-step wizards, and immersive content.

```tsx
import { FullscreenModal } from '@/core/smart-modal'

<FullscreenModal
  visible={isVisible}
  onClose={() => setIsVisible(false)}
  title="Settings"
>
  <YourComplexForm />
</FullscreenModal>
```

## Props

### Common Props (All Variants)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `visible` | `boolean` | required | Controls modal visibility |
| `onClose` | `() => void` | required | Callback when modal is closed |
| `title` | `string` | optional | Modal title |
| `subtitle` | `string` | optional | Optional subtitle |
| `children` | `ReactNode` | required | Modal content |
| `headerActions` | `ReactNode` | optional | Header actions (right side) |
| `footer` | `ReactNode` | optional | Footer content |
| `showCloseButton` | `boolean` | `true` | Show close button in header |
| `closeOnOverlayPress` | `boolean` | `true` | Close when overlay is pressed |
| `closeOnBackPress` | `boolean` | `true` | Close on Android back button |
| `containerStyle` | `ViewStyle` | optional | Custom container style |
| `contentStyle` | `ViewStyle` | optional | Custom content style |
| `testID` | `string` | optional | Test ID for testing |

### SmartModal Only

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'centered' \| 'bottomSheet' \| 'fullscreen'` | `'centered'` | Modal variant |
| `animationType` | `'fade' \| 'slide' \| 'none'` | `'fade'` | Animation type |
| `maxWidth` | `number` | `400` | Max width for centered modals |

### CenteredModal Only

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `maxWidth` | `number` | `400` | Maximum width of the modal |

## Usage Examples

### Alert Modal

```tsx
import { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { CenteredModal } from '@/core/smart-modal'

function AlertExample() {
  const [visible, setVisible] = useState(false)

  return (
    <View>
      <TouchableOpacity onPress={() => setVisible(true)}>
        <Text>Show Alert</Text>
      </TouchableOpacity>

      <CenteredModal
        visible={visible}
        onClose={() => setVisible(false)}
        title="Alert"
        footer={
          <TouchableOpacity
            style={{ backgroundColor: 'blue', padding: 12, borderRadius: 8 }}
            onPress={() => setVisible(false)}
          >
            <Text style={{ color: 'white', textAlign: 'center' }}>OK</Text>
          </TouchableOpacity>
        }
      >
        <Text>This is an important message!</Text>
      </CenteredModal>
    </View>
  )
}
```

### Form Modal (Fullscreen)

```tsx
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { FullscreenModal } from '@/core/smart-modal'

function FormExample() {
  const [visible, setVisible] = useState(false)
  const [name, setName] = useState('')

  return (
    <View>
      <TouchableOpacity onPress={() => setVisible(true)}>
        <Text>Edit Profile</Text>
      </TouchableOpacity>

      <FullscreenModal
        visible={visible}
        onClose={() => setVisible(false)}
        title="Edit Profile"
        headerActions={
          <TouchableOpacity onPress={() => setVisible(false)}>
            <Text>Cancel</Text>
          </TouchableOpacity>
        }
        footer={
          <TouchableOpacity
            style={{ backgroundColor: 'blue', padding: 16, borderRadius: 8 }}
            onPress={() => setVisible(false)}
          >
            <Text style={{ color: 'white', textAlign: 'center' }}>Save</Text>
          </TouchableOpacity>
        }
      >
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Enter name"
          style={{ padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 16 }}
        />
      </FullscreenModal>
    </View>
  )
}
```

### Custom Actions in Header

```tsx
import { CenteredModal } from '@/core/smart-modal'

<CenteredModal
  visible={visible}
  onClose={() => setVisible(false)}
  title="Settings"
  headerActions={
    <TouchableOpacity onPress={handleSave}>
      <Text>Save</Text>
    </TouchableOpacity>
  }
>
  <YourContent />
</CenteredModal>
```

## Platform-Specific Behavior

- **Android**: Automatically handles back button press when `closeOnBackPress` is true
- **iOS**: Uses native slide animations for bottom sheet and fullscreen variants
- **Web**: Uses CSS animations and proper overlay handling
- **All platforms**: Theme colors are automatically applied from your Expo Router theme

## Responsive Design

SmartModal follows Expo's responsive design best practices:

- **Flexbox-based layouts**: Uses flex properties for natural content flow
- **Percentage sizing**: Centered modal uses 90% width with max-width constraint
- **Adaptive containers**: Modal content naturally adapts to available space
- **No hardcoded breakpoints**: Relies on flexbox and percentages instead of fixed screen sizes

The modal automatically adapts to different screen sizes through:
- Percentage-based widths (90% for centered, 100% for bottom sheet/fullscreen)
- Flex layouts for content distribution
- Max-width constraints for large screens
- Natural content flow with flex properties

### Custom Responsive Behavior

You can override responsive behavior by providing custom styles via `containerStyle`, `contentStyle`, or the variant-specific props like `maxWidth` for CenteredModal.

## Theme Integration

The modal automatically uses your theme colors:

- `colors.card` - Modal background
- `colors.text` - Title and text
- `colors.textSecondary` - Subtitle
- `colors.surfaceVariant` - Close button background
- `colors.modalOverlay` - Overlay background (fallback to rgba(0,0,0,0.5))
- `colors.border` - Border colors

## Migration from Existing Modals

To migrate existing modals to use SmartModal:

1. Replace `Modal` from `react-native` with the appropriate SmartModal variant
2. Move overlay styling into the component (handled automatically)
3. Use the `title`, `subtitle`, `headerActions`, and `footer` props for structured content
4. Remove manual close button handling (use `showCloseButton` prop)

Example migration:

```tsx
// Before
<Modal visible={visible} transparent animationType="fade">
  <View style={styles.overlay}>
    <View style={styles.modal}>
      <TouchableOpacity onPress={onClose}>
        <Ionicons name="close" />
      </TouchableOpacity>
      <Text>Title</Text>
      {children}
    </View>
  </View>
</Modal>

// After
<CenteredModal
  visible={visible}
  onClose={onClose}
  title="Title"
>
  {children}
</CenteredModal>
```

## TypeScript Support

All components are fully typed. Import types as needed:

```tsx
import type { SmartModalProps, CenteredModalProps } from '@/core/smart-modal'
```
