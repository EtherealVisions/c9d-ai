# Phase.dev Setup Guide

This guide walks you through setting up Phase.dev for secure environment variable management in the C9D AI platform.

## Overview

Phase.dev is used to securely manage environment variables across different environments (development, staging, production). The platform uses the official Phase.dev Node.js SDK for reliable and secure integration.

## Quick Setup

### 1. Get Your Phase.dev Service Token

1. Visit [Phase.dev Console](https://console.phase.dev)
2. Sign up or log in to your account
3. Navigate to the **AI.C9d.Web** app (or create it if it doesn't exist)
4. Go to **Settings** → **Service Tokens**
5. Generate a new service token with appropriate permissions
6. Copy the token (it starts with `pss_`)

### 2. Configure Your Local Environment

Add your service token to your local environment using **one** of these methods:

#### Option A: Environment Variable (Recommended)
```bash
export PHASE_SERVICE_TOKEN=pss_your_token_here
```

#### Option B: Local .env File
Create or edit `.env.local` in your project root:
```bash
# .env.local
PHASE_SERVICE_TOKEN=pss_your_token_here
```

### 3. Validate Your Setup

Run the automated setup validation:
```bash
pnpm run setup:phase-dev
```

This will check:
- ✅ SDK installation
- ✅ Token availability and validity
- ✅ Phase.dev connectivity
- ✅ Environment variable loading
- ✅ App configuration

## Token Loading Precedence

The Phase.dev integration checks for your service token in the following order (highest to lowest priority):

1. **`process.env.PHASE_SERVICE_TOKEN`** - Runtime environment variable
2. **Local `.env.local`** - Local development overrides
3. **Local `.env`** - Local development defaults
4. **Workspace root `.env.local`** - Monorepo overrides
5. **Workspace root `.env`** - Monorepo defaults

**Recommendation**: Use `.env.local` for development as it's gitignored and won't be committed.

## Environment Variables in Phase.dev

### Required Variables

Ensure these variables are configured in your Phase.dev app:

#### Database Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=postgresql://postgres:password@localhost:5432/your_db
```

#### Authentication (Clerk)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key
CLERK_SECRET_KEY=sk_test_your_key
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret
```

#### Application Configuration
```
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Adding Variables to Phase.dev

1. Go to [Phase.dev Console](https://console.phase.dev)
2. Select the **AI.C9d.Web** app
3. Choose your environment (development, staging, production)
4. Click **Add Variable**
5. Enter the variable name and value
6. Save the changes

## Development Workflow

### Starting Development

1. **Ensure token is configured** (see setup steps above)
2. **Start the development server**:
   ```bash
   pnpm dev
   ```
3. **Verify Phase.dev integration** in the console logs:
   ```
   [Phase.dev SDK] Successfully loaded 12 environment variables
   [Phase.dev SDK] Token source: .env.local
   ```

### Environment Variable Loading

The application automatically loads environment variables from Phase.dev on startup with fallback to local files:

```typescript
// Automatic loading with fallback
const result = await loadFromPhase()

if (result.success) {
  // Variables loaded from Phase.dev
  console.log(`Loaded ${Object.keys(result.variables).length} variables`)
} else {
  // Fallback to local environment
  console.log('Using local environment variables')
}
```

### Caching Behavior

- **Cache TTL**: 5 minutes (SDK managed)
- **Automatic refresh**: Background refresh when cache expires
- **Force refresh**: Use `loadFromPhase(true)` to bypass cache
- **Cache clearing**: Automatic on application restart

## Troubleshooting

### Common Issues

#### 1. "PHASE_SERVICE_TOKEN not found"

**Symptoms**: Application can't find the service token
**Solutions**:
- Verify token is set in one of the expected locations
- Check for typos in the environment variable name
- Ensure `.env.local` file is in the correct directory
- Run `pnpm run setup:phase-dev` to diagnose

#### 2. "Authentication failed" or "401 Unauthorized"

**Symptoms**: Token is found but rejected by Phase.dev
**Solutions**:
- Verify token is correct and not expired
- Check token permissions in Phase.dev console
- Ensure token has access to the AI.C9d.Web app
- Generate a new service token if needed

#### 3. "App not found" or "404 Not Found"

**Symptoms**: Phase.dev can't find the specified app
**Solutions**:
- Verify the app name is "AI.C9d.Web" in Phase.dev console
- Check the app exists in your Phase.dev account
- Ensure you have access permissions to the app

#### 4. "Network error" or "Connection timeout"

**Symptoms**: Can't connect to Phase.dev servers
**Solutions**:
- Check internet connection
- Verify firewall allows HTTPS to console.phase.dev
- Try again in a few minutes (temporary service issues)
- Check Phase.dev status page

#### 5. "Missing environment variables"

**Symptoms**: Some required variables are not loaded
**Solutions**:
- Add missing variables to Phase.dev console
- Verify variables are set for the correct environment
- Check variable names for typos
- Ensure variables are not marked as "disabled"

### Diagnostic Commands

```bash
# Full setup validation
pnpm run setup:phase-dev

# Check token availability
node -e "console.log(process.env.PHASE_SERVICE_TOKEN ? 'Token found' : 'Token not found')"

# Test Phase.dev connectivity
pnpm run test:phase-connectivity

# View environment loading diagnostics
pnpm run debug:phase-config
```

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
# Enable debug logging
export DEBUG=phase:*

# Or in .env.local
DEBUG=phase:*

# Run your application
pnpm dev
```

## Security Best Practices

### Token Security

- **Never commit tokens to git** - Use `.env.local` or environment variables
- **Use different tokens per environment** - Separate tokens for dev/staging/prod
- **Rotate tokens regularly** - Generate new tokens periodically
- **Limit token permissions** - Only grant necessary access levels

### Environment Separation

- **Development**: Use development environment in Phase.dev
- **Staging**: Use staging environment with staging-specific values
- **Production**: Use production environment with production values
- **Testing**: Use test environment or local-only variables

### Access Control

- **Team access**: Manage team member access through Phase.dev console
- **Role-based permissions**: Assign appropriate roles (read-only, admin, etc.)
- **Audit logging**: Monitor access and changes through Phase.dev logs

## Advanced Configuration

### Custom App Configuration

If you need to customize the Phase.dev app configuration:

```typescript
import { getPhaseConfig } from '@c9d/config'

// Custom configuration
const config = await getPhaseConfig({
  appName: 'Custom.App.Name',
  environment: 'custom-env'
})
```

### Manual Environment Loading

For advanced use cases, you can manually control environment loading:

```typescript
import { EnvironmentFallbackManager } from '@c9d/config'

const manager = new EnvironmentFallbackManager()
const result = await manager.loadEnvironment('AI.C9d.Web', 'development', {
  fallbackToLocal: true,
  forceReload: true
})
```

### Token Source Diagnostics

Get detailed information about token sources:

```typescript
import { PhaseTokenLoader } from '@c9d/config'

const diagnostics = await PhaseTokenLoader.getTokenSourceDiagnostics()
diagnostics.forEach(diagnostic => {
  console.log(`Source: ${diagnostic.source}, Valid: ${diagnostic.valid}`)
})
```

## Integration with CI/CD

### GitHub Actions

```yaml
name: Deploy with Phase.dev

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Load environment from Phase.dev
        env:
          PHASE_SERVICE_TOKEN: ${{ secrets.PHASE_SERVICE_TOKEN }}
        run: pnpm run setup:phase-dev
        
      - name: Build application
        env:
          PHASE_SERVICE_TOKEN: ${{ secrets.PHASE_SERVICE_TOKEN }}
        run: pnpm build
```

### Vercel Deployment

Add your Phase.dev service token to Vercel environment variables:

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add `PHASE_SERVICE_TOKEN` with your token value
4. Set the appropriate environment (Development, Preview, Production)

## Support

### Getting Help

- **Documentation**: This guide and inline code comments
- **Setup validation**: Run `pnpm run setup:phase-dev`
- **Team support**: Ask in #dev-support Slack channel
- **Phase.dev docs**: https://docs.phase.dev

### Reporting Issues

When reporting Phase.dev integration issues, include:

1. **Error messages**: Full error text and stack traces
2. **Setup validation output**: Results from `pnpm run setup:phase-dev`
3. **Environment details**: OS, Node.js version, package versions
4. **Steps to reproduce**: Clear reproduction steps
5. **Expected vs actual behavior**: What should happen vs what happens

### Contributing

To improve the Phase.dev integration:

1. **Follow security practices**: Never expose tokens or sensitive data
2. **Add tests**: Include tests for new functionality
3. **Update documentation**: Keep this guide current with changes
4. **Validate changes**: Run setup validation before submitting PRs