# Phase.dev Troubleshooting Guide

This guide provides detailed troubleshooting steps for common Phase.dev integration issues in the C9D AI platform.

## Quick Diagnostics

Run the automated diagnostic tool first:

```bash
pnpm run setup:phase-dev
```

This will identify most common issues automatically.

## Common Error Messages

### 1. "PHASE_SERVICE_TOKEN not found"

**Full Error**:
```
Phase.dev service token not available
```

**Cause**: The application cannot locate your Phase.dev service token in any of the expected locations.

**Solutions**:

1. **Check token locations** (in order of precedence):
   ```bash
   # Check environment variable
   echo $PHASE_SERVICE_TOKEN
   
   # Check local .env.local file
   cat .env.local | grep PHASE_SERVICE_TOKEN
   
   # Check local .env file
   cat .env | grep PHASE_SERVICE_TOKEN
   
   # Check workspace root .env.local
   cat ../.env.local | grep PHASE_SERVICE_TOKEN
   
   # Check workspace root .env
   cat ../.env | grep PHASE_SERVICE_TOKEN
   ```

2. **Set the token** using one of these methods:
   ```bash
   # Method 1: Environment variable (session-only)
   export PHASE_SERVICE_TOKEN=pss_your_token_here
   
   # Method 2: Add to .env.local (recommended)
   echo "PHASE_SERVICE_TOKEN=pss_your_token_here" >> .env.local
   
   # Method 3: Add to shell profile (persistent)
   echo "export PHASE_SERVICE_TOKEN=pss_your_token_here" >> ~/.zshrc
   source ~/.zshrc
   ```

3. **Verify token format**:
   - Should start with `pss_`
   - Should be approximately 40+ characters long
   - Should not contain spaces or special characters

### 2. "Phase.dev API error: 401 Unauthorized"

**Full Error**:
```
Phase.dev API error: 401 Unauthorized
Authentication failed
```

**Cause**: Your service token is invalid, expired, or doesn't have proper permissions.

**Solutions**:

1. **Verify token validity**:
   ```bash
   # Test token with curl
   curl -H "Authorization: Bearer $PHASE_SERVICE_TOKEN" \
        https://console.phase.dev/api/v1/apps
   ```

2. **Check token permissions**:
   - Log into [Phase.dev Console](https://console.phase.dev)
   - Go to Settings → Service Tokens
   - Verify your token has access to the AI.C9d.Web app
   - Check token expiration date

3. **Generate new token**:
   - In Phase.dev Console, go to Settings → Service Tokens
   - Click "Generate New Token"
   - Copy the new token and update your configuration
   - Delete the old token for security

### 3. "Phase.dev API error: 404 Not Found"

**Full Error**:
```
Phase.dev API error: 404 Not Found
App 'AI.C9d.Web' not found
```

**Cause**: The specified app doesn't exist in your Phase.dev account or you don't have access to it.

**Solutions**:

1. **Verify app exists**:
   - Log into [Phase.dev Console](https://console.phase.dev)
   - Check if "AI.C9d.Web" app is listed
   - Verify you have access permissions

2. **Create the app** if it doesn't exist:
   - In Phase.dev Console, click "Create App"
   - Name it exactly "AI.C9d.Web"
   - Add required environment variables

3. **Check app name configuration**:
   ```bash
   # Verify app name in package.json
   cat package.json | grep -A 3 '"phase"'
   
   # Should show:
   # "phase": {
   #   "appName": "AI.C9d.Web"
   # }
   ```

### 4. "Network error: ENOTFOUND console.phase.dev"

**Full Error**:
```
Network error: ENOTFOUND console.phase.dev
Failed to connect to Phase.dev servers
```

**Cause**: Network connectivity issues preventing connection to Phase.dev servers.

**Solutions**:

1. **Check internet connection**:
   ```bash
   # Test basic connectivity
   ping google.com
   
   # Test Phase.dev specifically
   ping console.phase.dev
   
   # Test HTTPS connectivity
   curl -I https://console.phase.dev
   ```

2. **Check firewall/proxy settings**:
   - Ensure HTTPS (port 443) is allowed to console.phase.dev
   - If behind corporate firewall, check with IT team
   - Try from different network (mobile hotspot) to isolate issue

3. **Check Phase.dev service status**:
   - Visit Phase.dev status page
   - Check their Twitter/social media for outage announcements
   - Try again in a few minutes

### 5. "Request timeout"

**Full Error**:
```
Phase.dev API error: Request timeout
Connection timed out after 10000ms
```

**Cause**: Slow network connection or Phase.dev server issues.

**Solutions**:

1. **Check network speed**:
   ```bash
   # Test download speed
   curl -o /dev/null -s -w "%{time_total}\n" https://console.phase.dev
   ```

2. **Retry with exponential backoff**:
   - The SDK automatically retries failed requests
   - Wait a few minutes and try again
   - Check if issue persists across multiple attempts

3. **Increase timeout** (if needed):
   ```typescript
   // Custom timeout configuration
   const result = await loadFromPhase(true, {
     timeout: 30000 // 30 seconds
   })
   ```

### 6. "Missing required environment variables"

**Full Error**:
```
Missing variables in Phase.dev: NEXT_PUBLIC_SUPABASE_URL, CLERK_SECRET_KEY
```

**Cause**: Required environment variables are not configured in your Phase.dev app.

**Solutions**:

1. **Add missing variables to Phase.dev**:
   - Log into [Phase.dev Console](https://console.phase.dev)
   - Select the AI.C9d.Web app
   - Choose correct environment (development/staging/production)
   - Add each missing variable with appropriate values

2. **Verify variable names**:
   - Check for typos in variable names
   - Ensure exact case matching (environment variables are case-sensitive)
   - Verify no extra spaces or special characters

3. **Check environment selection**:
   - Ensure you're adding variables to the correct environment
   - Development environment for local development
   - Production environment for deployed applications

## Advanced Troubleshooting

### Debug Mode

Enable detailed logging for in-depth troubleshooting:

```bash
# Enable Phase.dev debug logging
export DEBUG=phase:*

# Or add to .env.local
echo "DEBUG=phase:*" >> .env.local

# Run your application
pnpm dev
```

This will show detailed logs including:
- Token loading process
- API request/response details
- Cache operations
- Error stack traces

### Token Source Diagnostics

Get detailed information about token loading:

```javascript
// Create a diagnostic script: debug-token.js
const { PhaseTokenLoader } = require('./packages/config/src/phase-token-loader');

async function diagnoseToken() {
  console.log('🔍 Phase.dev Token Diagnostics\n');
  
  // Check all possible token sources
  const diagnostics = await PhaseTokenLoader.getTokenSourceDiagnostics();
  
  if (diagnostics.length === 0) {
    console.log('❌ No PHASE_SERVICE_TOKEN found in any location');
    return;
  }
  
  console.log('📍 Token Sources Found:');
  diagnostics.forEach((diagnostic, index) => {
    console.log(`${index + 1}. ${diagnostic.source}`);
    console.log(`   Path: ${diagnostic.path || 'N/A'}`);
    console.log(`   Valid: ${diagnostic.valid ? '✅' : '❌'}`);
    console.log(`   Length: ${diagnostic.tokenLength} characters`);
    console.log('');
  });
  
  // Get the active token
  const tokenSource = await PhaseTokenLoader.getValidatedToken();
  if (tokenSource) {
    console.log(`🎯 Active Token Source: ${tokenSource.source}`);
    console.log(`   Token Preview: ${tokenSource.token.substring(0, 10)}...`);
  } else {
    console.log('❌ No valid token available');
  }
}

diagnoseToken().catch(console.error);
```

Run the diagnostic:
```bash
node debug-token.js
```

### SDK Integration Testing

Test the SDK integration step by step:

```javascript
// Create a test script: test-sdk.js
const { PhaseSDKClient } = require('./packages/config/src/phase-sdk-client');

async function testSDK() {
  console.log('🧪 Phase.dev SDK Integration Test\n');
  
  const client = new PhaseSDKClient();
  
  try {
    // Test 1: Initialize client
    console.log('1. Initializing SDK client...');
    const initialized = await client.initialize('AI.C9d.Web', 'development');
    console.log(`   Result: ${initialized ? '✅ Success' : '❌ Failed'}`);
    
    if (!initialized) {
      console.log('   Cannot proceed with further tests');
      return;
    }
    
    // Test 2: Test connection
    console.log('\n2. Testing connection...');
    const connected = await client.testConnection();
    console.log(`   Result: ${connected ? '✅ Connected' : '❌ Connection failed'}`);
    
    // Test 3: Fetch secrets
    console.log('\n3. Fetching secrets...');
    const result = await client.getSecrets();
    console.log(`   Success: ${result.success ? '✅' : '❌'}`);
    console.log(`   Secret count: ${Object.keys(result.secrets).length}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    // Test 4: Get diagnostics
    console.log('\n4. Client diagnostics...');
    const diagnostics = client.getDiagnostics();
    console.log(`   Initialized: ${diagnostics.initialized}`);
    console.log(`   Token source: ${diagnostics.tokenSource?.source || 'Unknown'}`);
    
  } catch (error) {
    console.error('❌ SDK test failed:', error.message);
  }
}

testSDK().catch(console.error);
```

Run the SDK test:
```bash
node test-sdk.js
```

### Environment Loading Testing

Test the complete environment loading process:

```javascript
// Create a test script: test-env-loading.js
const { EnvironmentFallbackManager } = require('./packages/config/src/environment-fallback-manager');

async function testEnvironmentLoading() {
  console.log('🌍 Environment Loading Test\n');
  
  const manager = new EnvironmentFallbackManager();
  
  try {
    // Test with Phase.dev
    console.log('1. Testing Phase.dev loading...');
    const phaseResult = await manager.loadEnvironment('AI.C9d.Web', 'development', {
      fallbackToLocal: false,
      forceReload: true
    });
    
    console.log(`   Success: ${phaseResult.success ? '✅' : '❌'}`);
    console.log(`   Source: ${phaseResult.source}`);
    console.log(`   Variable count: ${Object.keys(phaseResult.variables).length}`);
    
    if (phaseResult.tokenSource) {
      console.log(`   Token source: ${phaseResult.tokenSource.source}`);
    }
    
    if (phaseResult.error) {
      console.log(`   Error: ${phaseResult.error}`);
    }
    
    // Test with fallback
    console.log('\n2. Testing with fallback enabled...');
    const fallbackResult = await manager.loadEnvironment('AI.C9d.Web', 'development', {
      fallbackToLocal: true,
      forceReload: true
    });
    
    console.log(`   Success: ${fallbackResult.success ? '✅' : '❌'}`);
    console.log(`   Source: ${fallbackResult.source}`);
    console.log(`   Variable count: ${Object.keys(fallbackResult.variables).length}`);
    
  } catch (error) {
    console.error('❌ Environment loading test failed:', error.message);
  }
}

testEnvironmentLoading().catch(console.error);
```

Run the environment loading test:
```bash
node test-env-loading.js
```

## Performance Issues

### Slow Environment Loading

**Symptoms**: Application takes a long time to start or load environment variables.

**Diagnostics**:
```bash
# Time the environment loading
time node -e "
const { loadFromPhase } = require('./packages/config/src/phase');
loadFromPhase(true).then(result => {
  console.log(\`Loaded \${Object.keys(result.variables).length} variables\`);
}).catch(console.error);
"
```

**Solutions**:

1. **Check network latency**:
   ```bash
   # Measure API response time
   curl -o /dev/null -s -w "Total time: %{time_total}s\n" \
        -H "Authorization: Bearer $PHASE_SERVICE_TOKEN" \
        https://console.phase.dev/api/v1/apps
   ```

2. **Enable caching**:
   - Caching is enabled by default (5-minute TTL)
   - Verify cache is working by checking logs
   - Consider increasing cache TTL for development

3. **Use local fallback for development**:
   ```typescript
   // Prioritize local environment for development
   const result = await loadFromPhase(false, {
     fallbackToLocal: true
   });
   ```

### Memory Usage

**Symptoms**: High memory usage or memory leaks related to Phase.dev integration.

**Diagnostics**:
```bash
# Monitor memory usage
node --inspect --max-old-space-size=4096 your-app.js
```

**Solutions**:

1. **Clear cache periodically**:
   ```typescript
   import { clearPhaseCache } from '@c9d/config';
   
   // Clear cache when needed
   clearPhaseCache();
   ```

2. **Monitor cache size**:
   ```typescript
   import { getPhaseCacheStatus } from '@c9d/config';
   
   const status = getPhaseCacheStatus();
   console.log(`Cache size: ${status.variableCount} variables`);
   ```

## Security Issues

### Token Exposure

**Symptoms**: Service token accidentally exposed in logs, code, or version control.

**Immediate Actions**:

1. **Revoke the exposed token**:
   - Log into Phase.dev Console immediately
   - Go to Settings → Service Tokens
   - Delete the exposed token
   - Generate a new token

2. **Update configuration**:
   ```bash
   # Update with new token
   export PHASE_SERVICE_TOKEN=pss_new_token_here
   
   # Or update .env.local
   sed -i 's/PHASE_SERVICE_TOKEN=.*/PHASE_SERVICE_TOKEN=pss_new_token_here/' .env.local
   ```

3. **Check git history**:
   ```bash
   # Search for token in git history
   git log --all --grep="pss_" --oneline
   
   # If found, consider repository cleanup or rotation
   ```

### Unauthorized Access

**Symptoms**: Unexpected changes to environment variables or unauthorized API access.

**Investigation Steps**:

1. **Check Phase.dev audit logs**:
   - Log into Phase.dev Console
   - Go to Settings → Audit Logs
   - Review recent changes and access patterns

2. **Rotate all tokens**:
   - Generate new service tokens
   - Update all environments and team members
   - Revoke old tokens

3. **Review team access**:
   - Audit team member permissions
   - Remove unnecessary access
   - Enable two-factor authentication

## Getting Additional Help

### Escalation Process

If you can't resolve the issue using this guide:

1. **Gather diagnostic information**:
   ```bash
   # Run full diagnostics
   pnpm run setup:phase-dev > phase-diagnostics.txt 2>&1
   
   # Include system information
   echo "Node.js version: $(node --version)" >> phase-diagnostics.txt
   echo "npm version: $(npm --version)" >> phase-diagnostics.txt
   echo "OS: $(uname -a)" >> phase-diagnostics.txt
   ```

2. **Create a minimal reproduction**:
   - Isolate the issue to the smallest possible code example
   - Remove any sensitive information (tokens, URLs, etc.)
   - Document exact steps to reproduce

3. **Contact support**:
   - **Team support**: #dev-support Slack channel
   - **Phase.dev support**: support@phase.dev
   - **GitHub issues**: Create issue in project repository

### Information to Include

When asking for help, always include:

- **Error messages**: Complete error text and stack traces
- **Diagnostic output**: Results from `pnpm run setup:phase-dev`
- **Environment details**: OS, Node.js version, package versions
- **Configuration**: Sanitized configuration (remove tokens!)
- **Steps to reproduce**: Clear, step-by-step reproduction
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Workarounds tried**: What solutions you've already attempted

### Self-Help Resources

- **Phase.dev Documentation**: https://docs.phase.dev
- **SDK Documentation**: https://github.com/phasehq/phase-node
- **Project Documentation**: `docs/phase-dev-setup.md`
- **Code Examples**: `packages/config/src/__tests__/`
- **Setup Validation**: `scripts/setup-phase-dev.js`