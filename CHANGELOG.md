# Changelog

## [1.18.0] - 2026-06-02
### Added
- Rewrote the Authentication Screen (`/auth`) from scratch using the premium `SmartScreenHeader`, registering a dynamic "Reset App" action inside the `SmartKebabMenu`, and maintaining complete `KeyboardSafeView` scroll containment.
- Integrated page reload automation via `window.location.reload()` into the web updates screen refresh button, ensuring exact disabled-state conditional comparisons.
- Implemented smart badge toggle checks inside `SmartKebabMenu` that hide the updates badge unless a remote update is downloadable or a cached APK is installable.
