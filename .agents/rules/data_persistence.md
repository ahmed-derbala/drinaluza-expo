---
trigger: always_on
---

## Architectural Rules: Data Persistence

You must always use the custom storage modules for any data persistence operations.

- Normal (non-sensitive) data (application settings, flags, caches): `src/core/storage/` (`@storage`).
- Protected data (auth tokens, user profiles, saved accounts, push tokens): `src/core/secure-storage/` (`@secure-storage`).
- `src/core/storage/` may import from `@secure-storage` (mass-clear helpers). Never import in the reverse direction.

### Strict Guardrails:
- **NEVER** import or use `@react-native-async-storage/async-storage` or `expo-secure-store` directly in features, screens, or hooks.
- All persistent data access must go through the abstracted layers in `src/core/storage/` and `src/core/secure-storage/`.
