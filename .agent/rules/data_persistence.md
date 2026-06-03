---
trigger: always_on
---

## Architectural Rules: Data Persistence

You must always use the custom storage module located at `src/core/storage/` for any data persistence operations (e.g., storing auth tokens, user profiles, application settings, or flags). 

### Strict Guardrails:
- **NEVER** import or use `@react-native-async-storage/async-storage` or `expo-secure-store` directly in features, screens, or hooks.
- All persistent data access must go through the abstracted layer in `src/core/storage/`.

