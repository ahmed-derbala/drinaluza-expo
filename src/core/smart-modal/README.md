# SmartModal

A modern, accessible, cross-platform modal system for React Native and Expo web. SmartModal provides a single base component plus purpose-built variants for alerts, confirmations, dialogs, bottom sheets, and fullscreen flows. It is theme-aware, responsive, and fully typed.

## Features

- **Multiple variants**: `centered`, `bottomSheet`, and `fullscreen`
- **Alert & confirm helpers**: `AlertModal` and `ConfirmModal` for one-liner dialogs
- **Rich header support**: icon, title, subtitle, and message with status-driven colors
- **Built-in action buttons**: declare buttons as data with optional icons, variants, colors, loading, and disabled states
- **Accessible**: modal roles, labels, keyboard/back-button handling, and screen-reader-friendly structure
- **Responsive**: mobile-first layout that adapts to tablets and web automatically
- **Theme integration**: Uses your Expo Router theme tokens out of the box
- **Type-safe**: Full TypeScript support

## Installation

Import components from `@/core/smart-modal`:

```tsx
import { SmartModal, CenteredModal, BottomSheetModal, FullscreenModal, AlertModal, ConfirmModal } from '@/core/smart-modal'
```

## Components

### SmartModal (Base Component)

Use the base component when you need full control over the variant and layout.

```tsx
<SmartModal
	visible={visible}
	onClose={() => setVisible(false)}
	variant="centered"
	title="Edit Item"
	subtitle="Make changes below"
	buttons={[
		{ text: 'Cancel', onPress: () => setVisible(false), variant: 'outlined' },
		{ text: 'Save', onPress: handleSave, variant: 'filled', icon: 'checkmark' }
	]}
>
	<YourForm />
</SmartModal>
```

### CenteredModal

A centered dialog ideal for alerts, confirmations, forms, and focused interactions.

```tsx
<CenteredModal
	visible={visible}
	onClose={() => setVisible(false)}
	title="Switch User"
	icon="people"
	message="You will be redirected to the login screen."
	buttons={[
		{ text: 'Cancel', variant: 'outlined', onPress: () => setVisible(false) },
		{ text: 'Switch', variant: 'filled', onPress: switchUser }
	]}
/>
```

### BottomSheetModal

A sheet anchored to the bottom of the screen. Best for pickers, filters, and mobile-first lists.

```tsx
<BottomSheetModal visible={visible} onClose={() => setVisible(false)} title="Select Option">
	<YourPicker />
</BottomSheetModal>
```

### FullscreenModal

A fullscreen view for complex forms, wizards, and immersive content.

```tsx
<FullscreenModal visible={visible} onClose={() => setVisible(false)} title="Settings" headerActions={<Text onPress={handleSave}>Save</Text>}>
	<YourSettings />
</FullscreenModal>
```

### AlertModal

A single-action alert with a status icon and a confirm button.

```tsx
<AlertModal visible={visible} onClose={() => setVisible(false)} title="Changes Saved" message="Your profile has been updated successfully." status="success" confirmText="Great" />
```

### ConfirmModal

A two-action confirmation dialog with cancel and confirm buttons.

```tsx
<ConfirmModal visible={visible} onClose={() => setVisible(false)} title="Delete Account?" message="This action cannot be undone." danger onConfirm={handleDelete} />
```

## Props

### Common Props

| Prop                  | Type                                                       | Default     | Description                                        |
| --------------------- | ---------------------------------------------------------- | ----------- | -------------------------------------------------- |
| `visible`             | `boolean`                                                  | required    | Controls modal visibility                          |
| `onClose`             | `() => void`                                               | required    | Callback when modal is closed                      |
| `status`              | `'default' \| 'info' \| 'success' \| 'warning' \| 'error'` | `'default'` | Semantic status that drives icon and accent color  |
| `icon`                | `string \| ReactNode`                                      | optional    | Ionicons name or custom element                    |
| `iconColor`           | `string`                                                   | optional    | Override the icon color                            |
| `iconBackgroundColor` | `string`                                                   | optional    | Override the icon background color                 |
| `title`               | `string`                                                   | optional    | Modal title                                        |
| `subtitle`            | `string`                                                   | optional    | Subtitle shown under the title                     |
| `message`             | `string`                                                   | optional    | Simple message text rendered in the body           |
| `children`            | `ReactNode`                                                | optional    | Custom content                                     |
| `buttons`             | `SmartModalButton[]`                                       | optional    | Footer action buttons                              |
| `headerActions`       | `ReactNode`                                                | optional    | Extra actions on the right side of the header      |
| `footer`              | `ReactNode`                                                | optional    | Custom footer. When provided, `buttons` is ignored |
| `closeOnOverlayPress` | `boolean`                                                  | `true`      | Close when the overlay is pressed                  |
| `closeOnBackPress`    | `boolean`                                                  | `true`      | Close on Android hardware back button              |
| `containerStyle`      | `ViewStyle`                                                | optional    | Overlay/container style overrides                  |
| `contentStyle`        | `ViewStyle`                                                | optional    | Content area style overrides                       |
| `modalStyle`          | `ViewStyle`                                                | optional    | Modal card style overrides                         |
| `accessible`          | `boolean`                                                  | `true`      | Whether the modal card is an accessibility element |
| `accessibilityLabel`  | `string`                                                   | optional    | Accessibility label for the modal                  |
| `accessibilityRole`   | `AccessibilityRole`                                        | optional    | Accessibility role for the modal                   |
| `testID`              | `string`                                                   | optional    | Test ID prefix                                     |

### SmartModal Only

| Prop       | Type                                          | Default      | Description                   |
| ---------- | --------------------------------------------- | ------------ | ----------------------------- |
| `variant`  | `'centered' \| 'bottomSheet' \| 'fullscreen'` | `'centered'` | Modal variant                 |
| `maxWidth` | `number`                                      | `400`        | Max width for centered modals |

### CenteredModal Only

| Prop       | Type     | Default | Description                |
| ---------- | -------- | ------- | -------------------------- |
| `maxWidth` | `number` | `400`   | Maximum width of the modal |

### BottomSheetModal Only

| Prop        | Type     | Default | Description              |
| ----------- | -------- | ------- | ------------------------ |
| `maxHeight` | `number` | `88%`   | Maximum height in pixels |

### SmartModalButton

| Prop                 | Type                                | Default    | Description                  |
| -------------------- | ----------------------------------- | ---------- | ---------------------------- |
| `text`               | `string`                            | required   | Button label                 |
| `onPress`            | `() => void \| Promise<void>`       | required   | Press handler                |
| `variant`            | `'filled' \| 'outlined' \| 'ghost'` | `'filled'` | Button style                 |
| `color`              | `string`                            | optional   | Override button/accent color |
| `icon`               | `IconName`                          | optional   | Ionicons icon name           |
| `iconPosition`       | `'left' \| 'right'`                 | `'left'`   | Icon position                |
| `disabled`           | `boolean`                           | `false`    | Disable the button           |
| `loading`            | `boolean`                           | `false`    | Show a loading spinner       |
| `style`              | `ViewStyle`                         | optional   | Container style override     |
| `textStyle`          | `TextStyle`                         | optional   | Text style override          |
| `accessibilityLabel` | `string`                            | optional   | Accessibility label          |
| `testID`             | `string`                            | optional   | Test ID                      |

### AlertModal Props

Inherits common props except `variant`, `buttons`, and `footer`.

| Prop            | Type                                | Default   | Description                      |
| --------------- | ----------------------------------- | --------- | -------------------------------- |
| `confirmText`   | `string`                            | `'OK'`    | Confirm button label             |
| `onConfirm`     | `() => void \| Promise<void>`       | `onClose` | Confirm callback                 |
| `confirmButton` | `Omit<SmartModalButton, 'onPress'>` | optional  | Full control over confirm button |

### ConfirmModal Props

Inherits common props except `variant`, `buttons`, and `footer`.

| Prop            | Type                                | Default     | Description                          |
| --------------- | ----------------------------------- | ----------- | ------------------------------------ |
| `cancelText`    | `string`                            | `'Cancel'`  | Cancel button label                  |
| `confirmText`   | `string`                            | `'Confirm'` | Confirm button label                 |
| `onCancel`      | `() => void \| Promise<void>`       | `onClose`   | Cancel callback                      |
| `onConfirm`     | `() => void \| Promise<void>`       | `onClose`   | Confirm callback                     |
| `danger`        | `boolean`                           | `false`     | Render confirm button in error color |
| `cancelButton`  | `Omit<SmartModalButton, 'onPress'>` | optional    | Full control over cancel button      |
| `confirmButton` | `Omit<SmartModalButton, 'onPress'>` | optional    | Full control over confirm button     |

## Usage Examples

### Success Alert

```tsx
<AlertModal visible={visible} onClose={() => setVisible(false)} title="Payment Successful" message="Your transaction has been completed." status="success" confirmText="Done" />
```

### Error Alert

```tsx
<AlertModal
	visible={visible}
	onClose={() => setVisible(false)}
	title="Something Went Wrong"
	message="Please check your connection and try again."
	status="error"
	confirmText="Retry"
	onConfirm={retry}
/>
```

### Confirmation Dialog

```tsx
<ConfirmModal visible={visible} onClose={() => setVisible(false)} title="Discard Changes?" message="You have unsaved changes that will be lost." status="warning" onConfirm={discard} />
```

### Custom Buttons with Icons

```tsx
<CenteredModal
	visible={visible}
	onClose={() => setVisible(false)}
	title="Share Document"
	status="info"
	buttons={[
		{ text: 'Copy Link', variant: 'outlined', icon: 'link', onPress: copyLink },
		{ text: 'Share', variant: 'filled', icon: 'share', iconPosition: 'right', onPress: share }
	]}
/>
```

### Bottom Sheet with List

```tsx
<BottomSheetModal visible={visible} onClose={() => setVisible(false)} title="Choose Language" closeOnOverlayPress>
	{languages.map((lang) => (
		<LanguageRow key={lang.id} language={lang} onPress={selectLanguage} />
	))}
</BottomSheetModal>
```

### Fullscreen Form

```tsx
<FullscreenModal
	visible={visible}
	onClose={() => setVisible(false)}
	title="New Invoice"
	buttons={[
		{ text: 'Cancel', variant: 'ghost', onPress: () => setVisible(false) },
		{ text: 'Create', variant: 'filled', onPress: createInvoice }
	]}
>
	<InvoiceForm />
</FullscreenModal>
```

## Platform-Specific Behavior

- **Android**: Hardware back button closes the modal when `closeOnBackPress` is true
- **iOS**: Keyboard avoids centered modals
- **Web**: Transparent overlay and proper pointer handling
- **All platforms**: Theme colors are applied automatically

## Responsive Design

SmartModal is built mobile-first:

- Centered modals use `92%` width on phones and `55%` width on larger viewports, capped by `maxWidth`
- Footer buttons stack vertically on narrow screens and align horizontally on wider screens
- Padding and typography adapt to screen size
- Percentage-based widths and flex layouts avoid brittle breakpoints

Override layouts with `containerStyle`, `modalStyle`, or `contentStyle` when needed.

## Theme Integration

SmartModal reads from your theme automatically:

- `colors.card` - Modal background
- `colors.background` - Fullscreen background
- `colors.text` - Title and primary text
- `colors.textSecondary` - Subtitle and message
- `colors.textTertiary` - Bottom sheet drag handle
- `colors.surfaceVariant` - Close button background
- `colors.modalOverlay` - Overlay background
- `colors.border` - Header/footer separator
- `colors.primary` / `colors.info` / `colors.success` / `colors.warning` / `colors.error` - Status colors
- `colors.buttonText` - Text color for filled buttons

## Accessibility

- Modal card is marked with `accessibilityViewIsModal` and `importantForAccessibility`
- Close button has an explicit `accessibilityLabel`
- Action buttons expose `accessibilityRole="button"` and disabled/loading states
- Default `accessibilityRole` is `alert` when `status="error"`
- Provide `accessibilityLabel` when the title alone does not describe the modal

## TypeScript Support

All components are fully typed:

```tsx
import type { SmartModalProps, SmartModalButton, AlertModalProps, ConfirmModalProps } from '@/core/smart-modal'
```
