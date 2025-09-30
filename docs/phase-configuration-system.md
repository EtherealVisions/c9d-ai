# Phase.dev Configuration System

This document describes the Phase.dev configuration system implemented for the C9D AI monorepo, providing centralized environment variable management with proper precedence and validation.

## Overview

The configuration system provides:
- **Centralized Configuration**: Single `.phase-apps.json` file for all apps and packages
- **Precedence System**: `package.json` > root config > defaults
- **Validation**: Comprehensive validation with helpful error messages
- **CLI Tools**: Command-line utilities for validation and management
- **Type Safety**: Full TypeScript support with proper type definitions

## Configuration Files

### Root Configuration (`.phase-apps.json`)

The root configuration file maps apps and packages to their Phase.dev contexts:

```json
{
  "$schema": "./packages/env-tools/schemas/phase-apps-schema.json",
  "version": "1.0.0",
  "apps": {
    "web": {
      "phaseAppName": "AI.C9d.Web",
      "environment": "development",
      "fallbackEnvFiles": [".env.local", ".env"],
      "validation": { "strict": true }
    }
  },
  "packages": {
    "ui": {
      "phaseAppName": "AI.C9d.Shared",
      "environment": "development"
    }
  },
  "defaults": {
    "environment": "development",
    "fallbackEnvFiles": [".env.local", ".env"],
    "timeout": 5000,
    "retries": 3
  }
}
```

### Package-Level Configuration

Apps and packages can override configuration in their `package.json`:

```json
{
  "name": "@c9d/web",
  "phase": {
    "appName": "AI.C9d.Web",
    "environment": "staging",
    "validation": { "strict": true }
  }
}
```

## Configuration Schema

### App Configuration

```typescript
interface AppPhaseConfig {
  phaseAppName: string                    // Phase.dev app name (required)
  environment?: 'development' | 'staging' | 'production'
  fallbackEnvFiles?: string[]            // Fallback .env files
  validation?: { strict?: boolean }      // Validation settings
  timeout?: number                       // API timeout (1000-30000ms)
  retries?: number                       // Retry attempts (0-10)
}
```

### Package Configuration

```typescript
interface PackagePhaseConfig {
  phaseAppName: string                    // Phase.dev app name (required)
  environment?: 'development' | 'staging' | 'production'
  fallbackEnvFiles?: string[]            // Fallback .env files
  validation?: { strict?: boolean }      // Validation settings
  timeout?: number                       // API timeout (1000-30000ms)
  retries?: number                       // Retry attempts (0-10)
}
```

## Precedence System

Configuration is resolved with the following precedence (highest to lowest):

1. **Package.json Configuration**: `package.json` `phase` field
2. **Root Configuration**: `.phase-apps.json` app/package specific config
3. **Default Values**: `.phase-apps.json` `defaults` section

### Example Resolution

Given:
- Root config: `{ "apps": { "web": { "phaseAppName": "AI.C9d.Web", "environment": "development" } } }`
- Package.json: `{ "phase": { "environment": "staging" } }`
- Defaults: `{ "timeout": 5000 }`

Resolved configuration:
```json
{
  "phaseAppName": "AI.C9d.Web",     // From root config
  "environment": "staging",          // From package.json (highest precedence)
  "timeout": 5000                   // From defaults
}
```

## CLI Tools

### validate-config

Comprehensive configuration validation and management:

```bash
# List all configurations
pnpm validate-config list

# Validate all configurations
pnpm validate-config all

# Validate specific file
pnpm validate-config file .phase-apps.json

# Generate detailed report
pnpm validate-config report
```

### Example Output

```bash
$ pnpm validate-config list

📋 Phase.dev Configurations
Root: /path/to/monorepo

📱 Apps:
  web
    Phase App: AI.C9d.Web
    Environment: development
    Strict: Yes

📦 Packages:
  ui
    Phase App: AI.C9d.Shared
    Environment: development
```

## API Usage

### Loading Configuration

```typescript
import { 
  getCurrentAppConfig,
  getAppConfig,
  loadPhaseConfiguration 
} from '@coordinated/env-tools'

// Get configuration for current directory
const config = getCurrentAppConfig()

// Get configuration for specific app
const webConfig = getAppConfig('web')

// Load with detailed result
const result = loadPhaseConfiguration('./apps/web')
if (result.success) {
  console.log(`Loaded from: ${result.source}`)
  console.log(`Phase App: ${result.config.phaseAppName}`)
}
```

### Validation

```typescript
import { 
  validateAllConfigurations,
  validateConfigurationFile 
} from '@coordinated/env-tools'

// Validate all configurations
const validation = validateAllConfigurations()
if (!validation.valid) {
  console.error('Configuration errors:', validation.globalErrors)
}

// Validate specific file
const fileValidation = validateConfigurationFile('.phase-apps.json')
if (!fileValidation.valid) {
  console.error('File errors:', fileValidation.errors)
  console.warn('Suggestions:', fileValidation.suggestions)
}
```

### Utility Functions

```typescript
import { 
  getPhaseAppName,
  getEnvironment,
  getFallbackEnvFiles,
  isStrictValidation,
  findMonorepoRoot
} from '@coordinated/env-tools'

// Get specific configuration values
const phaseApp = getPhaseAppName('./apps/web')      // "AI.C9d.Web"
const env = getEnvironment('./apps/web')            // "development"
const fallbacks = getFallbackEnvFiles('./apps/web') // [".env.local", ".env"]
const strict = isStrictValidation('./apps/web')     // true
const root = findMonorepoRoot()                     // "/path/to/monorepo"
```

## Validation Rules

### Required Fields

- **version**: Semantic version string (e.g., "1.0.0")
- **apps**: Object with at least one app configuration
- **phaseAppName**: Required for each app/package

### Format Validation

- **phaseAppName**: Must match pattern `^[a-zA-Z0-9._-]+$`
- **environment**: Must be one of: `development`, `staging`, `production`
- **timeout**: Number between 1000 and 30000 (milliseconds)
- **retries**: Number between 0 and 10

### Business Rules

- **Duplicate Detection**: Warns about duplicate `phaseAppName` values
- **Reasonable Timeouts**: Warns about timeouts > 10 seconds
- **Package Validation**: Warns about strict validation on packages

## Error Handling

### Common Errors

1. **Missing Configuration File**
   ```
   ❌ .phase-apps.json not found in root directory
   ```

2. **Invalid JSON**
   ```
   ❌ Failed to parse JSON: Unexpected token '}' at position 123
   ```

3. **Missing Required Fields**
   ```
   ❌ Missing required field: version
   ❌ Missing phaseAppName for app: web
   ```

4. **Invalid Values**
   ```
   ❌ Invalid environment for app web: invalid-env
   ❌ "timeout" must be a number between 1000 and 30000
   ```

### Warnings

1. **Duplicate Phase App Names**
   ```
   ⚠️ Duplicate phaseAppName "AI.C9d.Shared" found. This may cause environment variable conflicts.
   ```

2. **Missing Defaults**
   ```
   ⚠️ app "web": no default environment specified, will use "development"
   ```

3. **High Timeouts**
   ```
   ⚠️ app "web": timeout of 15000ms is quite high, consider reducing for better performance
   ```

## Integration with Environment Loading

The configuration system integrates seamlessly with the existing environment loading:

```typescript
import { EnvironmentManager } from '@coordinated/env-tools'

// Environment manager automatically uses configuration
const manager = new EnvironmentManager({
  enablePhase: true,
  enableValidation: true
})

const result = await manager.loadEnvironment()
// Uses resolved configuration for Phase.dev integration
```

## Best Practices

### Configuration Organization

1. **Use Descriptive Phase App Names**: Follow pattern `AI.C9d.AppName`
2. **Group Related Packages**: Use shared Phase.dev contexts for related packages
3. **Set Appropriate Defaults**: Configure sensible defaults in root config
4. **Use Strict Validation**: Enable strict validation for apps, not packages

### Validation Workflow

1. **Pre-commit Validation**: Run `pnpm validate-config all` before commits
2. **CI/CD Integration**: Include configuration validation in build pipeline
3. **Regular Audits**: Generate reports periodically to review configuration health

### Error Resolution

1. **Check File Syntax**: Ensure valid JSON in configuration files
2. **Verify Required Fields**: All apps/packages must have `phaseAppName`
3. **Review Warnings**: Address warnings to prevent future issues
4. **Use Suggestions**: Follow CLI suggestions for common fixes

## Migration Guide

### From Legacy System

1. **Create Root Configuration**: Add `.phase-apps.json` with current mappings
2. **Update Package.json**: Add `phase` configuration to override defaults
3. **Validate Configuration**: Run `pnpm validate-config all` to verify setup
4. **Test Environment Loading**: Ensure environment variables load correctly

### Adding New Apps/Packages

1. **Add to Root Config**: Include new app/package in `.phase-apps.json`
2. **Set Package Config**: Add `phase` field to `package.json` if needed
3. **Validate Changes**: Run validation to ensure configuration is correct
4. **Test Integration**: Verify environment loading works as expected

## Troubleshooting

### Configuration Not Found

```bash
❌ No configuration found for app/package: myapp
```

**Solution**: Add the app/package to `.phase-apps.json` or add `phase` field to its `package.json`.

### Invalid Phase App Name

```bash
❌ "phaseAppName" contains invalid characters
```

**Solution**: Use only letters, numbers, dots, hyphens, and underscores in phase app names.

### Environment Loading Fails

```bash
❌ Failed to load environment variables
```

**Solution**: 
1. Check Phase.dev service token is available
2. Verify phase app name exists in Phase.dev
3. Ensure network connectivity to Phase.dev API

### Validation Errors

```bash
❌ Configuration validation failed
```

**Solution**:
1. Run `pnpm validate-config all --report` for detailed analysis
2. Fix reported errors and warnings
3. Re-run validation to confirm fixes

## Schema Reference

The configuration system includes a JSON schema for validation and IDE support:

```json
{
  "$schema": "./packages/env-tools/schemas/phase-apps-schema.json"
}
```

This provides:
- **IDE Autocomplete**: IntelliSense support in VS Code and other editors
- **Validation**: Real-time validation while editing configuration files
- **Documentation**: Hover tooltips with field descriptions

## Conclusion

The Phase.dev configuration system provides a robust, type-safe, and validated approach to managing environment variables across the monorepo. With proper precedence handling, comprehensive validation, and helpful CLI tools, it ensures reliable and maintainable environment configuration management.