# Troubleshooting Guide

This guide covers common issues you might encounter when developing or deploying the C9D AI application.

## Table of Contents

- [Environment and Configuration](#environment-and-configuration)
- [Package Management (pnpm)](#package-management-pnpm)
- [Build System (Turbo)](#build-system-turbo)
- [Database Issues](#database-issues)
- [Authentication Issues](#authentication-issues)
- [Phase.dev Integration](#phasedev-integration)
- [Deployment Issues](#deployment-issues)
- [Development Server Issues](#development-server-issues)
- [TypeScript Issues](#typescript-issues)
- [Performance Issues](#performance-issues)

## Environment and Configuration

### Missing Environment Variables

**Symptoms**:
- Application fails to start
- Database connection errors
- Authentication failures
- Build failures with configuration errors

**Error Messages**:
```
Error: Missing required environment variables: DATABASE_URL, CLERK_SECRET_KEY
Configuration validation failed: Required configuration variable 'DATABASE_URL' is missing
```

**Solutions**:

1. **Check environment file exists**:
   ```bash
   ls -la .env.local
   ```

2. **Copy from template**:
   ```bash
   cp .env.local.example .env.local
   ```

3. **Validate required variables**:
   ```bash
   # Run configuration test
   pnpm test:phase
   
   # Check specific variables
   echo $DATABASE_URL
   echo $NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
   ```

4. **Verify variable format**:
   ```bash
   # Database URL format
   DATABASE_URL=postgresql://user:password@host:port/database
   
   # Clerk keys format
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

### Environment Variable Not Loading

**Symptoms**:
- Variables are set but not accessible in application
- `undefined` values in runtime

**Solutions**:

1. **Check variable naming**:
   - Client-side variables must start with `NEXT_PUBLIC_`
   - Server-side variables don't need prefix

2. **Restart development server**:
   ```bash
   # Stop current server (Ctrl+C)
   pnpm dev
   ```

3. **Check file location**:
   - `.env.local` should be in project root
   - Not in `apps/web/` directory

4. **Verify no syntax errors**:
   ```bash
   # No spaces around =
   DATABASE_URL=postgresql://...
   
   # Quote values with special characters
   PASSWORD="my-complex-password!"
   ```

## Package Management (pnpm)

### pnpm Command Not Found

**Error**: `pnpm: command not found`

**Solutions**:

1. **Install pnpm globally**:
   ```bash
   npm install -g pnpm@latest
   ```

2. **Use corepack (Node.js 16.10+)**:
   ```bash
   corepack enable
   corepack prepare pnpm@latest --activate
   ```

3. **Verify installation**:
   ```bash
   pnpm --version
   which pnpm
   ```

### Dependency Resolution Errors

**Error Messages**:
```
ERR_PNPM_PEER_DEP_ISSUES
Cannot resolve dependency
Module not found
```

**Solutions**:

1. **Clear pnpm cache**:
   ```bash
   pnpm store prune
   ```

2. **Remove and reinstall**:
   ```bash
   rm -rf node_modules
   rm pnpm-lock.yaml
   pnpm install
   ```

3. **Check workspace configuration**:
   ```bash
   cat pnpm-workspace.yaml
   ```

4. **Install missing peer dependencies**:
   ```bash
   pnpm install --fix-peer-deps
   ```

### Workspace Linking Issues

**Error**: `Cannot find module '@c9d/ui'`

**Solutions**:

1. **Build packages first**:
   ```bash
   pnpm build:packages
   ```

2. **Check package exports**:
   ```bash
   cat packages/ui/package.json
   # Verify "main" and "types" fields
   ```

3. **Verify workspace configuration**:
   ```bash
   pnpm list --depth=0
   ```

4. **Reinstall with linking**:
   ```bash
   pnpm install --force
   ```

## Build System (Turbo)

### Turbo Build Failures

**Error Messages**:
```
Task failed with exit code 1
Build failed: apps/web:build
```

**Solutions**:

1. **Run with verbose output**:
   ```bash
   pnpm build --verbose
   ```

2. **Build specific package**:
   ```bash
   pnpm build --filter=@c9d/web
   ```

3. **Clear Turbo cache**:
   ```bash
   rm -rf .turbo/cache
   pnpm build
   ```

4. **Check individual package**:
   ```bash
   cd apps/web
   pnpm build
   ```

### Turbo Cache Issues

**Symptoms**:
- Builds using stale cache
- Changes not reflected in build output

**Solutions**:

1. **Force rebuild**:
   ```bash
   pnpm build --force
   ```

2. **Clear cache**:
   ```bash
   rm -rf .turbo/cache
   ```

3. **Check cache configuration**:
   ```bash
   cat turbo.json
   # Verify "outputs" and "inputs" are correct
   ```

### Task Dependency Errors

**Error**: `Task depends on itself`

**Solutions**:

1. **Check turbo.json configuration**:
   ```json
   {
     "pipeline": {
       "build": {
         "dependsOn": ["^build"], // ^ means dependencies only
         "outputs": ["dist/**"]
       }
     }
   }
   ```

2. **Verify package dependencies**:
   ```bash
   pnpm list --depth=1
   ```

## Database Issues

### Connection Failures

**Error Messages**:
```
Database connection failed
ECONNREFUSED
Connection timeout
```

**Solutions**:

1. **Check database URL format**:
   ```bash
   # Correct format
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

2. **Test connection**:
   ```bash
   # Using psql
   psql $DATABASE_URL
   
   # Using node
   node -e "const { Client } = require('pg'); const client = new Client(process.env.DATABASE_URL); client.connect().then(() => console.log('Connected')).catch(console.error)"
   ```

3. **Check Supabase configuration**:
   - Verify project is active
   - Check connection pooling settings
   - Ensure IP allowlist includes your IP

4. **Verify credentials**:
   - Check username/password
   - Ensure database exists
   - Verify permissions

### Migration Issues

**Error**: `Migration failed`

**Solutions**:

1. **Check migration files**:
   ```bash
   ls supabase/migrations/
   ```

2. **Run migrations manually**:
   ```bash
   # If using Supabase CLI
   supabase db reset
   
   # Or run SQL directly
   psql $DATABASE_URL -f supabase/migrations/20240101000000_initial_schema.sql
   ```

3. **Verify database schema**:
   ```sql
   \dt -- List tables
   \d users -- Describe users table
   ```

## Authentication Issues

### Clerk Configuration Errors

**Error Messages**:
```
Clerk authentication failed
Invalid publishable key
Webhook verification failed
```

**Solutions**:

1. **Verify Clerk keys**:
   ```bash
   # Check key format
   echo $NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY # Should start with pk_
   echo $CLERK_SECRET_KEY # Should start with sk_
   ```

2. **Check Clerk dashboard configuration**:
   - Verify domain settings
   - Check webhook endpoints
   - Ensure application is active

3. **Test webhook endpoint**:
   ```bash
   curl -X POST http://localhost:3000/api/webhooks/clerk \
     -H "Content-Type: application/json" \
     -d '{"type": "user.created", "data": {}}'
   ```

### User Sync Issues

**Error**: `User synchronization failed`

**Solutions**:

1. **Check user sync service**:
   ```bash
   # Check logs for sync errors
   pnpm dev
   # Look for [UserSync] messages
   ```

2. **Verify database tables**:
   ```sql
   SELECT * FROM users LIMIT 5;
   SELECT * FROM organization_memberships LIMIT 5;
   ```

3. **Test manual sync**:
   ```bash
   # Create test user via Clerk dashboard
   # Check if user appears in database
   ```

## Phase.dev Integration

### Connection Failures

**Error Messages**:
```
Phase.dev connection failed
Phase.dev API error: 401 Unauthorized
Phase.dev connection timeout
```

**Solutions**:

1. **Verify service token**:
   ```bash
   echo $PHASE_SERVICE_TOKEN
   # Should start with ph_ or similar
   ```

2. **Test API connection**:
   ```bash
   curl -H "Authorization: Bearer $PHASE_SERVICE_TOKEN" \
        -H "X-App-Name: AI.C9d.Web" \
        https://console.phase.dev/api/v1/secrets
   ```

3. **Check Phase.dev console**:
   - Verify app name is exactly `AI.C9d.Web`
   - Check service token permissions
   - Ensure token is not expired

4. **Test fallback behavior**:
   ```bash
   # Temporarily remove Phase.dev token
   unset PHASE_SERVICE_TOKEN
   pnpm dev
   # Should fall back to local env vars
   ```

### Configuration Loading Issues

**Error**: `Failed to load environment variables from Phase.dev`

**Solutions**:

1. **Check app configuration**:
   - App name must be `AI.C9d.Web`
   - Environment should match `NODE_ENV`

2. **Verify network connectivity**:
   ```bash
   ping console.phase.dev
   curl -I https://console.phase.dev
   ```

3. **Check rate limits**:
   - Phase.dev may have rate limiting
   - Check console for API usage

## Deployment Issues

### Vercel Build Failures

**Error Messages**:
```
Build failed
Command "node scripts/vercel-build.js" exited with 1
```

**Solutions**:

1. **Check build logs**:
   - Go to Vercel dashboard
   - View detailed build logs
   - Look for specific error messages

2. **Test build locally**:
   ```bash
   NODE_ENV=production pnpm build
   ```

3. **Verify environment variables**:
   - Check Vercel environment variable settings
   - Ensure all required variables are set
   - Verify Phase.dev token is configured

4. **Check build script**:
   ```bash
   node scripts/vercel-build.js
   ```

### Environment Variable Issues in Production

**Symptoms**:
- Variables work locally but not in production
- Phase.dev integration fails in deployment

**Solutions**:

1. **Check Vercel environment settings**:
   - Verify variables are set for correct environment
   - Check variable names match exactly

2. **Test Phase.dev in production**:
   - Check Phase.dev logs for API calls
   - Verify service token permissions

3. **Check build-time vs runtime variables**:
   - `NEXT_PUBLIC_*` variables are build-time
   - Server variables are runtime

## Development Server Issues

### Port Already in Use

**Error**: `Port 3000 is already in use`

**Solutions**:

1. **Kill existing process**:
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

2. **Use different port**:
   ```bash
   PORT=3001 pnpm dev
   ```

3. **Check for zombie processes**:
   ```bash
   ps aux | grep node
   ps aux | grep next
   ```

### Hot Reload Not Working

**Symptoms**:
- Changes not reflected in browser
- Need to manually refresh

**Solutions**:

1. **Restart development server**:
   ```bash
   # Stop with Ctrl+C, then restart
   pnpm dev
   ```

2. **Clear Next.js cache**:
   ```bash
   rm -rf apps/web/.next
   pnpm dev
   ```

3. **Check file watchers (Linux)**:
   ```bash
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

4. **Verify file permissions**:
   ```bash
   ls -la apps/web/app/
   # Ensure files are readable
   ```

## TypeScript Issues

### Module Resolution Errors

**Error**: `Cannot find module '@c9d/types'`

**Solutions**:

1. **Build packages first**:
   ```bash
   pnpm build:packages
   ```

2. **Check TypeScript configuration**:
   ```bash
   cat tsconfig.json
   # Verify paths and baseUrl
   ```

3. **Verify package exports**:
   ```bash
   cat packages/types/package.json
   # Check "main" and "types" fields
   ```

4. **Restart TypeScript server** (VS Code):
   - Cmd/Ctrl + Shift + P
   - "TypeScript: Restart TS Server"

### Type Errors in Packages

**Error**: `Type errors in workspace packages`

**Solutions**:

1. **Build packages in order**:
   ```bash
   pnpm build:packages
   ```

2. **Check TypeScript references**:
   ```json
   // tsconfig.json
   {
     "references": [
       { "path": "./packages/types" },
       { "path": "./packages/ui" }
     ]
   }
   ```

3. **Verify type exports**:
   ```typescript
   // packages/types/src/index.ts
   export * from './api'
   export * from './common'
   ```

## Performance Issues

### Slow Development Server

**Symptoms**:
- Long startup time
- Slow hot reload
- High CPU usage

**Solutions**:

1. **Optimize Next.js configuration**:
   ```javascript
   // next.config.mjs
   export default {
     experimental: {
       optimizePackageImports: ['@c9d/ui']
     }
   }
   ```

2. **Use SWC instead of Babel**:
   ```json
   // next.config.mjs - SWC is default in Next.js 12+
   {
     "swcMinify": true
   }
   ```

3. **Exclude unnecessary files**:
   ```json
   // tsconfig.json
   {
     "exclude": ["node_modules", ".next", "dist"]
   }
   ```

### Slow Builds

**Solutions**:

1. **Use Turbo cache**:
   ```bash
   # Ensure cache is working
   turbo run build --dry-run
   ```

2. **Optimize TypeScript**:
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "incremental": true,
       "tsBuildInfoFile": ".tsbuildinfo"
     }
   }
   ```

3. **Parallel builds**:
   ```bash
   pnpm build --parallel
   ```

## Getting Help

### Debug Information

When reporting issues, include:

1. **System information**:
   ```bash
   node --version
   pnpm --version
   turbo --version
   ```

2. **Environment details**:
   ```bash
   echo $NODE_ENV
   echo $VERCEL_ENV
   ```

3. **Package information**:
   ```bash
   pnpm list --depth=0
   ```

4. **Error logs**:
   - Full error messages
   - Stack traces
   - Build logs

### Diagnostic Commands

```bash
# Test all systems
pnpm test:run

# Test Phase.dev integration
pnpm test:phase

# Verify build process
pnpm build --verbose

# Check TypeScript
pnpm typecheck

# Lint code
pnpm lint

# Health check (if available)
curl http://localhost:3000/api/health
```

### Reset Everything

If all else fails, reset the entire development environment:

```bash
# Clean everything
rm -rf node_modules
rm -rf .turbo/cache
rm -rf apps/web/.next
rm -rf packages/*/dist
rm pnpm-lock.yaml

# Reinstall
pnpm install

# Rebuild
pnpm build

# Test
pnpm test:run
```

This should resolve most common issues. If problems persist, check the specific service documentation or seek help with the diagnostic information above.