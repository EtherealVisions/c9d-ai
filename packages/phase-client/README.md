# @coordinated/phase-client

Phase.dev client library for the Coordinated.app monorepo with secure, memory-only caching.

## Features

- 🔒 **Memory-only caching** - Secrets are never written to disk
- 🚀 **Automatic environment resolution** - Detects environment from context
- 📊 **Smart memory management** - LRU eviction with optional memory limits
- ✅ **Type-safe** - Full TypeScript support
- 🔄 **Auto-refresh** - TTL-based cache expiration
- 🧹 **Secure cleanup** - Overwrites memory on process exit

## Installation

```bash
pnpm add @coordinated/phase-client
```

## Usage

### Basic Usage

```typescript
import { PhaseClient } from '@coordinated/phase-client';

const client = new PhaseClient({
  appNamespace: 'WEB',
  token: process.env.PHASE_TOKEN_READ_WEB!,
  cache: {
    enabled: true,
    ttl: 300 // 5 minutes
  }
});

// Get all secrets
const secrets = await client.getSecrets();

// Get single secret
const apiKey = await client.getSecret('API_KEY');

// Inject into process.env
await client.inject();
```

### Cache Configuration

The cache is **memory-only** for security. No secrets are ever written to disk.

```typescript
const client = new PhaseClient({
  appNamespace: 'WEB',
  token: process.env.PHASE_TOKEN_READ_WEB!,
  cache: {
    enabled: true,        // Enable caching (default: true)
    ttl: 600,            // Cache for 10 minutes (default: 300)
    maxMemoryMB: 100     // Memory limit in MB (default: 50)
  }
});
```

#### Cache Behavior

1. **Sensible defaults**: 50MB memory limit by default (configurable)
2. **Memory warnings**: Warns at 75% usage before evicting
3. **LRU eviction**: Evicts least recently used entries when limit reached
4. **TTL expiration**: Each entry expires after the configured TTL
5. **Health monitoring**: Tracks memory usage and eviction count
6. **Secure cleanup**: Memory is overwritten before clearing on process exit

#### Memory Management

**Default Configuration (50MB limit)**:
- Suitable for most Node.js applications
- Warns when approaching 75% (37.5MB)
- Starts evicting at 100% (50MB)
- Logs first eviction and every 10th after

**Memory Warnings**:
```
⚠️  [SecretCache] Memory usage at 75% of 50MB limit. Consider increasing maxMemoryMB or reducing cache TTL.
⚠️  [SecretCache] Memory limit reached (50MB). Starting LRU eviction.
🗑️  [SecretCache] Evicted LRU entry: development (0.45MB). Memory: 49.55/50MB
```

**Monitoring Cache Health**:
```typescript
// Get cache statistics
const stats = client.getCacheStats();
console.log(`Cache health: ${stats.healthStatus}`);
console.log(`Memory: ${stats.memoryUsageMB}/${stats.maxMemoryMB}MB (${stats.percentUsed}%)`);
console.log(`Entries: ${stats.entries}, Evictions: ${stats.evictionCount}`);

// Health status levels:
// - 'healthy': < 75% memory used
// - 'warning': 75-90% memory used  
// - 'critical': > 90% memory used
```

### Environment Resolution

The client automatically resolves the target environment:

```typescript
// 1. App-specific override
PHASE_ENV__WEB=feature-123

// 2. Environment map
PHASE_ENV_MAP="WEB=feature-123,API=staging"

// 3. Global environment
PHASE_ENV=development

// 4. Auto-detection (Vercel, GitHub Actions, etc.)
```

### Advanced Features

```typescript
// Force refresh (bypass cache)
const freshSecrets = await client.refresh();

// Get current environment
const env = client.getEnvironment(); // e.g., "production"

// Get cache statistics  
const stats = client.getCacheStats();
console.log(`Cache: ${stats.entries} entries, ${stats.memoryUsageMB}MB used`);
console.log(`Health: ${stats.healthStatus} (${stats.percentUsed}% of ${stats.maxMemoryMB}MB)`);

// Clear cache manually
await client.clearCache();

// Validate cache integrity
const isValid = await cache.validate('production');
```

## Security

### Memory-Only Storage

**CRITICAL**: This client NEVER writes secrets to disk. All caching is done in-memory only.

```typescript
// ✅ CORRECT - Memory only
const cache = new SecretCache({
  enabled: true,
  ttl: 300,
  maxMemoryMB: 50
});

// ❌ NEVER IMPLEMENTED - No disk storage
// storage: 'file' // This option does not exist
```

### Secure Cleanup

The cache automatically clears on:
- Process exit (`exit` event)
- SIGINT (Ctrl+C)
- SIGTERM (graceful shutdown)

Memory is overwritten with random data before clearing for additional security.

### Best Practices

1. **Use short TTLs in production** (5-10 minutes)
2. **Set memory limits** for containerized environments
3. **Monitor cache stats** in production
4. **Never log secret values**
5. **Use read-only tokens** for applications

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `appNamespace` | string | required | App identifier (WEB, API, etc.) |
| `token` | string | required | Phase.dev read token |
| `phaseEnv` | string | 'auto' | Environment override or 'auto' |
| `strict` | boolean | false | Fail on missing required vars |
| `stripPrefix` | boolean | true | Remove namespace prefix from keys |
| `cache.enabled` | boolean | true | Enable in-memory caching |
| `cache.ttl` | number | 300 | Cache TTL in seconds |
| `cache.maxMemoryMB` | number | 50 | Memory limit in MB (default: 50) |
| `debug` | boolean | false | Enable debug logging |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PHASE_TOKEN_READ_*` | Phase.dev read token for each app |
| `PHASE_ENV` | Global environment override |
| `PHASE_ENV__*` | Per-app environment override |
| `PHASE_ENV_MAP` | Compact environment mapping |
| `PHASE_DEBUG` | Enable debug output |
| `PHASE_METRICS` | Enable metrics logging |

## Error Handling

```typescript
try {
  const secrets = await client.getSecrets();
} catch (error) {
  if (error.code === 'PHASE_TIMEOUT') {
    // Handle timeout
  } else if (error.code === 'PHASE_UNAUTHORIZED') {
    // Handle auth error
  } else {
    // Handle other errors
  }
}
```

## Testing

```typescript
// Mock for testing
jest.mock('@coordinated/phase-client', () => ({
  PhaseClient: jest.fn().mockImplementation(() => ({
    getSecrets: jest.fn().mockResolvedValue({
      DATABASE_URL: 'postgres://test',
      API_KEY: 'test-key'
    }),
    inject: jest.fn(),
    getEnvironment: jest.fn().mockReturnValue('test')
  }))
}));
```

## License

MIT