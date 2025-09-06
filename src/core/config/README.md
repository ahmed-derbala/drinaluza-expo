# Configuration Module

This module provides centralized configuration management for different environments (local, development, production).

## Usage

### Basic Configuration Access

```typescript
import { getConfig, getApiUrl, getLocalApiUrl, defaultConfig } from '@/core/config'

// Get full configuration for an environment
const localConfig = getConfig('local')
const devConfig = getConfig('development')
const prodConfig = getConfig('production')

// Get API URLs
const localApiUrl = getApiUrl('local') // http://10.173.243.120/api
const devApiUrl = getApiUrl('development') // https://dev.drinaluza.com/api
const prodApiUrl = getApiUrl('production') // https://drinaluza.com/api

// Get local API URL with custom server details
const customLocalUrl = getLocalApiUrl('192.168.1.100', 3000) // http://192.168.1.100:3000/api
```

### Using in API Calls

The configuration is automatically used in the core API client. The settings API will use the appropriate configuration based on the selected server mode.

### Environment-Specific Features

```typescript
import { getConfig } from '@/core/config'

const config = getConfig('production')

if (config.features.enableLogging) {
  console.log('This will only log in local and development')
}

if (config.features.enableAnalytics) {
  // Initialize analytics
}
```

### Server Configuration

The module provides default local servers and handles server configuration through the settings API:

```typescript
import { defaultLocalServers, getServerConfigForEnvironment } from '@/core/config'

// Default local servers are automatically used when no configuration exists
console.log(defaultLocalServers)

// Get server-specific configuration
const serverConfig = getServerConfigForEnvironment('development')
console.log(serverConfig.timeout) // 15000ms
console.log(serverConfig.retryAttempts) // 3
```

## Configuration Structure

Each environment configuration includes:

- **Server settings**: baseUrl, apiPath, timeout, retryAttempts
- **Feature flags**: enableLogging, enableAnalytics, enableCrashReporting
- **App metadata**: name, version, environment

## Modifying Configurations

To modify server URLs or other settings:

1. **For environment-specific changes**: Edit the `configs` object in `/src/core/config/index.ts`
2. **For runtime changes**: Use the settings API to switch between local servers or server modes

## Examples

### Switching Server Mode in Auth Screen

The auth screen automatically uses the configuration when switching between local, development, and production modes. The API client will automatically use the correct base URL and timeout settings.

### Adding New Environment

To add a new environment (e.g., staging):

1. Add the environment to the `Environment` type
2. Add configuration to the `configs` object
3. Update the `getCurrentEnvironment` function if needed
