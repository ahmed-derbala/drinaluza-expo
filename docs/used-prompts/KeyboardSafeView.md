
rewrite from scratch KeyboardSafeView
Create reusable component in src/core/KeyboardSafeView/ and use it on all screens containing input fields.

When a user focuses or types into an input field, ensure the input remains fully visible and is never covered by the on-screen keyboard on Android, iOS, or web mobile view.

Requirements:

* Automatically move, scroll, or resize the layout when the keyboard appears.
* The currently focused input must always stay visible with comfortable spacing above the keyboard.
* Prevent the keyboard from overlapping the active field, validation messages, dropdowns, or submit button.
* Support portrait and landscape orientation.
* Handle long forms correctly with smooth scrolling.
* Work reliably on both Android and iOS.
* Avoid layout jumps, flickering, or excessive scrolling.
* Dismiss keyboard correctly when tapping outside inputs or submitting.
* Use platform-appropriate keyboard avoidance behavior.
* Recalculate layout when keyboard height changes.
* Ensure bottom buttons remain accessible when typing.

Implementation expectations:

* Use KeyboardAvoidingView where appropriate.
* Use a scroll-aware container for forms.
* Automatically scroll to the focused input.
* Respect safe area insets and device notches.
* Avoid hardcoded keyboard heights.
* Ensure proper behavior inside modals, tabs, and nested navigators.
* Maintain smooth animations and good UX performance.
