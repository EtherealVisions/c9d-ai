# Configuration Management with Phase.dev

This directory contains the configuration management system that integrates Phase.dev for secure environment variable management with fallback to local environment variables.

## Overview

The configuration system provides:
- **Secure environment variable management** through Phase.dev
- **Automatic fallback** to local environment variables
- **Caching** for improved performance
- **Validation** of required configuration variables
- **Centralized configuration management** across the application

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Application   │───▶│ Config Manager   │───▶│   Phase.dev     │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        │
                       ┌──────────────────┐              │
                       │ Local .env files │◀─────────────┘
                       │   (fallback)     │
                       └──────────────────┘
```

## Files

- **`phase.ts`** - Phase.dev API client and environment loading utilities
- **`manager.ts`** - Centralized configuration manager with caching and validation
- **`init.ts`** - Application initialization utilities
- **`api-init.ts`** - API route initialization helpers
- **`__tests__/`** - Comprehensive test suite

## Usage

### Basic Setup

1. **Set up Phase.dev** (optional but recommended for production):
   ```bash
   # Set your Phase.dev service token
   export PHASE_SERVICE_TOKEN=your_token_here
   ```

2. **Initialize configuration** in your application:
   ```typescript
   import { initializeAppConfig } from '@/lib/config/init';
   
   // In your app initialization (layout.tsx, API routes, etc.)
   await initializeAppConfig();
   ```

3. **Access configuration values**:
   ```typescript
   import { getAppConfig, getAppConfigSync } from '@/lib/config/init';
   
   // Async access (recommended)
   const databaseUrl = await getAppConfig('DATABASE_URL');
   
   // Sync access (only after initialization)
   const apiKey = getAppConfigSync('API_KEY');
   ```

### API Routes

For API routes, use the initialization helper:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { initializeAppConfig, getAppConfigSync } from '@/lib/config/init';

export async function GET(request: NextRequest) {
  // Initialize configuration
  await initializeAppConfig();
  
  // Access configuration
  const databaseUrl = getAppConfigSync('DATABASE_URL');
  
  // Your API logic here...
}
```

### Advanced Usage

#### Custom Validation Rules

```typescript
import { getConfigManager, ValidationRule } from '@/lib/config/manager';

const customRules: ValidationRule[] = [
  {
    key: 'CUSTOM_API_URL',
    required: true,
    validator: (value: string) => value.startsWith('https://'),
    errorMessage: 'CUSTOM_API_URL must be HTTPS'
  }
];

const manager = getConfigManager({ validationRules: customRules });
await manager.initialize();
```

#### Manual Configuration Management

```typescript
import { CentralizedConfigManager } from '@/lib/config/manager';

const manager = new CentralizedConfigManager({
  phaseConfig: {
    serviceToken: 'your-token',
    appName: 'AI.C9d.Web',
    environment: 'production'
  },
  enableCaching: true,
  cacheTTL: 10 * 60 * 1000, // 10 minutes
  fallbackToEnv: true
});

await manager.initialize();
const value = manager.get('MY_CONFIG_VAR');
```

## Configuration Variables

### Required Variables

The system validates these required configuration variables by default:

- **`DATABASE_URL`** - PostgreSQL connection string
- **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`** - Clerk publishable key (must start with `pk_`)
- **`CLERK_SECRET_KEY`** - Clerk secret key (must start with `sk_`)
- **`NEXT_PUBLIC_SUPABASE_URL`** - Supabase project URL (must be HTTPS)
- **`SUPABASE_SERVICE_ROLE_KEY`** - Supabase service role key

### Phase.dev Configuration

- **`PHASE_SERVICE_TOKEN`** - Your Phase.dev service token (optional)
- **`NODE_ENV`** - Environment name (development, staging, production)

## Environment Setup

### Development

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your local development values in `.env.local`

3. (Optional) Set up Phase.dev:
   - Create an account at [Phase.dev](https://phase.dev)
   - Create an app named "AI.C9d.Web"
   - Get your service token
   - Add `PHASE_SERVICE_TOKEN=your_token` to `.env.local`

### Production (Vercel)

1. **Without Phase.dev**: Set environment variables directly in Vercel dashboard

2. **With Phase.dev** (recommended):
   - Set only `PHASE_SERVICE_TOKEN` in Vercel environment variables
   - Manage all other variables through Phase.dev console
   - Variables from Phase.dev will be loaded at runtime

## Error Handling

The configuration system is designed to be resilient:

1. **Phase.dev unavailable**: Falls back to local environment variables
2. **Network errors**: Uses cached values if available, otherwise falls back
3. **Invalid configuration**: Provides clear error messages with validation details
4. **Missing variables**: Graceful degradation with warnings

## Caching

- **Default TTL**: 5 minutes
- **Cache invalidation**: Automatic on errors or manual refresh
- **Background refresh**: Automatic cache refresh when expired
- **Memory efficient**: Only caches successfully loaded configurations

## Testing

The configuration system includes comprehensive tests:

```bash
# Run all configuration tests
pnpm test lib/config/

# Run specific test files
pnpm test lib/config/__tests__/phase.test.ts
pnpm test lib/config/__tests__/manager.test.ts
pnpm test lib/config/__tests__/init.test.ts
```

## Troubleshooting

### Common Issues

1. **"Configuration manager not initialized"**
   - Ensure `initializeAppConfig()` is called before accessing configuration
   - Use `getAppConfig()` instead of `getAppConfigSync()` for automatic initialization

2. **"Phase.dev API error: 401 Unauthorized"**
   - Check your `PHASE_SERVICE_TOKEN` is correct
   - Verify the token has access to the "AI.C9d.Web" app

3. **"Required configuration variable 'X' is missing"**
   - Add the variable to your `.env.local` file or Phase.dev console
   - Check the variable name matches exactly (case-sensitive)

4. **Build failures with missing environment variables**
   - The system handles build-time gracefully
   - Ensure critical variables are available during build

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=config:*
```

This will show detailed logs about configuration loading, caching, and fallback behavior.

## Security Considerations

- **Never commit** `.env.local` or any files containing secrets
- **Use Phase.dev** for production secrets management
- **Validate** all configuration values before use
- **Rotate** Phase.dev service tokens regularly
- **Monitor** configuration access logs in Phase.dev console

## Migration Guide

### From Direct process.env Usage

Replace direct `process.env` access:

```typescript
// Before
const databaseUrl = process.env.DATABASE_URL;

// After
import { getAppConfigSync } from '@/lib/config/init';
const databaseUrl = getAppConfigSync('DATABASE_URL');
```

### From Other Configuration Libraries

The system is designed to be a drop-in replacement for most configuration libraries while adding Phase.dev integration and improved error handling.