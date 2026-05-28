---
trigger: always_on
---

## Environment Variables & Configuration Rule

You are **STRICTLY FORBIDDEN** from using `process.env.VARIABLE_NAME` directly in any application logic, components, or hooks (e.g., inside `src/features/`, `src/core/`, etc.).

### 1. The Single Source of Truth
All environment variables must be funneled, validated, and exported through the centralized configuration file located at `src/config/index.ts`. 

### 2. Correct Usage Example
When you need to access an environment variable (like an API URL or feature flag), import it from the config file
