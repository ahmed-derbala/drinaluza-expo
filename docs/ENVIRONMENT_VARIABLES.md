# Environment Variable Configuration

## Overview
This project uses a `.env` file to manage environment variables without hardcoding them in configuration files.

## How It Works

### 1. Environment Variables (.env)
All environment variables should be prefixed with `EXPO_PUBLIC_` to be accessible in the app:

```bash
EXPO_PUBLIC_BACKEND_URL=https://drinaluza-expressjs.onrender.com
EXPO_PUBLIC_API_KEY=your-api-key-here
```

### 2. Build Process
The `build:apk` script in `package.json` automatically loads variables from `.env`:

```bash
npm run build:apk
```

This script:
1. Exports all variables from `.env` to the shell environment
2. Runs the EAS build with those variables available
3. The variables are baked into the JavaScript bundle during build

### 3. Accessing Variables in Code

**Option 1: Direct access (recommended)**
```typescript
const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
```

**Option 2: Via Constants (fallback)**
```typescript
import Constants from 'expo-constants';
const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL;
```

### 4. Configuration Files

- **app.config.js**: Automatically injects all `EXPO_PUBLIC_*` variables into `expo.extra`
- **eas.json**: Standard EAS configuration (no hardcoded values)
- **src/config/index.ts**: Uses both methods for maximum reliability

## Adding New Environment Variables

1. Add to `.env`:
   ```bash
   EXPO_PUBLIC_YOUR_NEW_VAR=value
   ```

2. That's it! No need to modify any config files.

3. Access in your code:
   ```typescript
   const yourVar = process.env.EXPO_PUBLIC_YOUR_NEW_VAR;
   ```

## Testing

Run the test script to verify environment variables are loaded correctly:

```bash
./scripts/test-env.sh
```

## Important Notes

- ⚠️ Never commit `.env` to git (it's in `.gitignore`)
- ✅ Always prefix variables with `EXPO_PUBLIC_` for client-side access
- ✅ Variables are baked into the bundle at build time (not runtime)
- ✅ Changes to `.env` require a rebuild to take effect
