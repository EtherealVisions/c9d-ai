# @c9d/config

Node.js-only configuration package with comprehensive environment variable management and Phase.dev integration.

## Features

- **File System Access**: Loads `.env`, `.env.local`, `.env.production`, etc.
- **Phase.dev Integration**: Real API integration for secure environment variables
- **Advanced Caching**: Persistent caching with TTL and invalidation
- **Environment Validation**: Comprehensive validation and error handling
- **Token Management**: Secure token loading from multiple sources

## Runtime Requirements

**Node.js Only**: This package requires Node.js runtime and will throw an error if imported in:
- Edge Runtime (Vercel Edge Functions)
- Browser environments
- Web Workers

## Usage

### API Routes (Node.js Runtime)
```typescript
import { getConfigManager, loadFromPhase } from '@c9d/config'

export async function GET() {
  const config = getConfigManager()
  await config.initialize()
  
  const dbUrl = config.get('DATABASE_URL')
  return Response.json({ status: 'ok' })
}
```

### Edge Runtime Alternative
For edge runtime contexts (middleware, edge functions), use direct environment access:

```typescript
// middleware.ts - Edge Runtime
export default function middleware(req: NextRequest) {
  // Direct environment access - no @c9d/config import
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  
  if (!clerkKey) {
    return new Response('Configuration error', { status: 503 })
  }
  
  // Continue with middleware logic
}
```

## Architecture Decision

We maintain **only the Node.js version** because:

1. **Edge Runtime Limitations**: Edge runtime can only access `process.env` anyway
2. **Reduced Complexity**: Single codebase instead of dual versions
3. **Clear Separation**: Forces explicit decisions about where configuration is needed
4. **Better Performance**: Edge contexts use direct env access (faster)
5. **Fail Fast**: Clear error messages when used incorrectly

## Migration from Edge Versions

If you were using edge-compatible versions:

```typescript
// Before (edge version)
import { getConfigValue } from '@c9d/config/edge'

// After (direct access)
const value = process.env.CONFIG_KEY
```

## Environment Variable Priority

1. `process.env` (highest priority)
2. `.env.local`
3. `.env.{NODE_ENV}` (`.env.production`, `.env.development`, etc.)
4. `.env` (lowest priority)

## Phase.dev Integration

Automatically loads secrets from Phase.dev when `PHASE_SERVICE_TOKEN` is available:

```typescript
import { loadFromPhase } from '@c9d/config'

const result = await loadFromPhase()
if (result.success) {
  console.log(`Loaded ${result.variableCount} secrets from Phase.dev`)
}
```

## Error Handling

The package will throw clear errors when used incorrectly:

```typescript
// In Edge Runtime
import { getConfigManager } from '@c9d/config'
// ❌ Error: @c9d/config is not compatible with Edge Runtime

// In Browser
import { loadFromPhase } from '@c9d/config'  
// ❌ Error: @c9d/config requires Node.js environment
```

## Best Practices

1. **Use in API Routes**: Perfect for server-side configuration loading
2. **Avoid in Middleware**: Use direct `process.env` access instead
3. **Initialize Once**: Use singleton pattern for configuration managers
4. **Handle Errors**: Always handle configuration loading errors gracefully
5. **Validate Environment**: Use built-in validation for required variables