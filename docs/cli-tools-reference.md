# CLI Tools Reference

This document provides comprehensive reference for the Phase.dev environment management CLI tools.

## Overview

The monorepo includes four CLI tools for environment management:

- **env-wrapper**: Execute commands with Phase.dev environment loading
- **validate-env**: Validate environment configurations
- **validate-config**: Validate Phase.dev configuration files
- **vercel-phase-prebuild**: Vercel prebuild integration

All tools are accessible from any location in the monorepo via `pnpm <tool-name>`.

## env-wrapper

Environment wrapper for executing commands with Phase.dev integration.

### Usage

```bash
pnpm env-wrapper [options] <command...>
```

### Options

- `-e, --env <file>`: Environment file to load
- `--config <file>`: App environment configuration file
- `--no-phase`: Disable Phase.dev integration
- `--no-validation`: Skip environment validation
- `-d, --debug`: Enable debug output
- `-v, --verbose`: Enable verbose output
- `--dry-run`: Show what would be executed without running

### Examples

```bash
# Basic usage
pnpm env-wrapper npm run dev

# With specific environment file
pnpm env-wrapper -e .env.production npm run build

# With debug output
pnpm env-wrapper --debug --verbose npm test

# Dry run to see what would happen
pnpm env-wrapper --dry-run npm run start

# Skip Phase.dev integration
pnpm env-wrapper --no-phase npm run dev
```

### Environment Variables

- `PHASE_SERVICE_TOKEN`: Phase.dev service token
- `PHASE_ENV`: Phase.dev environment (development, staging, production)
- `PHASE_DEBUG`: Enable Phase.dev debug output
- `ENV_WRAPPER_DEBUG`: Enable wrapper debug output
- `ENV_WRAPPER_VERBOSE`: Enable wrapper verbose output

## validate-env

Validate environment configurations for applications.

### Usage

```bash
pnpm validate-env [command] [options]
```

### Commands

#### `app [path]`

Validate environment for a specific application.

```bash
pnpm validate-env app [options] [path]
```

**Options:**
- `-d, --debug`: Enable debug output
- `-v, --verbose`: Enable verbose output
- `-s, --strict`: Exit with error code on validation failure
- `--json`: Output results as JSON

**Examples:**
```bash
# Validate current directory
pnpm validate-env app

# Validate specific app
pnpm validate-env app ./apps/web

# Strict mode with debug output
pnpm validate-env app --strict --debug ./apps/web
```

#### `all`

Validate environment for all applications in monorepo.

```bash
pnpm validate-env all [options]
```

**Options:**
- `-d, --debug`: Enable debug output
- `-v, --verbose`: Enable verbose output
- `-s, --strict`: Exit with error code if any validation fails
- `--json`: Output results as JSON
- `--summary`: Show only summary results

**Examples:**
```bash
# Validate all applications
pnpm validate-env all

# Strict mode with summary
pnpm validate-env all --strict --summary

# JSON output for CI/CD
pnpm validate-env all --json
```

#### `status [path]`

Show environment status for an application.

```bash
pnpm validate-env status [options] [path]
```

**Options:**
- `-d, --debug`: Enable debug output
- `-v, --verbose`: Enable verbose output
- `--json`: Output status as JSON
- `--watch`: Watch for changes and update status

**Examples:**
```bash
# Show status for current directory
pnpm validate-env status

# Verbose status with details
pnpm validate-env status --verbose

# Watch for changes
pnpm validate-env status --watch
```

### Environment Variables

- `PHASE_SERVICE_TOKEN`: Phase.dev service token
- `PHASE_ENV`: Phase.dev environment
- `NODE_ENV`: Node environment

## validate-config

Validate Phase.dev configuration across the monorepo.

### Usage

```bash
pnpm validate-config [command] [options]
```

### Commands

#### `all`

Validate all configurations in the monorepo.

```bash
pnpm validate-config all [options]
```

**Options:**
- `-r, --root <path>`: Monorepo root path
- `--report`: Generate detailed report

**Examples:**
```bash
# Validate all configurations
pnpm validate-config all

# Generate detailed report
pnpm validate-config all --report
```

#### `file <path>`

Validate a specific configuration file.

```bash
pnpm validate-config file <path>
```

**Examples:**
```bash
# Validate root configuration
pnpm validate-config file .phase-apps.json

# Validate app package.json
pnpm validate-config file apps/web/package.json
```

#### `list`

List all configurations in the monorepo.

```bash
pnpm validate-config list [options]
```

**Options:**
- `-r, --root <path>`: Monorepo root path
- `--json`: Output as JSON

**Examples:**
```bash
# List all configurations
pnpm validate-config list

# JSON output
pnpm validate-config list --json
```

#### `report`

Generate a detailed configuration report.

```bash
pnpm validate-config report [options]
```

**Options:**
- `-r, --root <path>`: Monorepo root path
- `-o, --output <file>`: Output file (default: stdout)

**Examples:**
```bash
# Generate report to stdout
pnpm validate-config report

# Save report to file
pnpm validate-config report -o config-report.txt
```

### Configuration Files

- `.phase-apps.json`: Root configuration mapping
- `package.json`: App-specific phase configuration
- `env.config.json`: Environment validation rules

## vercel-phase-prebuild

Vercel prebuild integration for Phase.dev.

### Usage

```bash
pnpm vercel-phase-prebuild [options]
```

### Options

- `-d, --debug`: Enable debug output
- `-v, --verbose`: Enable verbose output
- `--strict`: Exit with error code on failure (blocks build)
- `--dry-run`: Show what would be done without executing
- `--timeout <seconds>`: Timeout for Phase.dev API calls (default: 30)

### Examples

```bash
# Basic prebuild
pnpm vercel-phase-prebuild

# Debug mode
pnpm vercel-phase-prebuild --debug

# Strict mode with custom timeout
pnpm vercel-phase-prebuild --strict --timeout 60

# Dry run to see what would happen
pnpm vercel-phase-prebuild --dry-run --verbose
```

### Environment Variables

- `PHASE_SERVICE_TOKEN`: Phase.dev service token (required)
- `VERCEL_ENV`: Vercel environment (production, preview, development)
- `NODE_ENV`: Node environment
- `PHASE_DEBUG`: Enable Phase.dev debug output

## Error Handling

All CLI tools provide comprehensive error handling with:

### Error Types

- **Configuration Errors**: Invalid or missing configuration files
- **Network Errors**: Phase.dev API connectivity issues
- **Authentication Errors**: Invalid or missing service tokens
- **Validation Errors**: Environment variable validation failures

### Error Messages

Each error includes:
- Clear description of the problem
- Suggested solutions
- Relevant context (file paths, configuration details)
- Debug information (when debug mode is enabled)

### Exit Codes

- `0`: Success
- `1`: General error
- Specific error codes for different failure types

## Debug and Troubleshooting

### Debug Modes

All tools support debug and verbose modes:

```bash
# Enable debug output
pnpm <tool> --debug

# Enable verbose output
pnpm <tool> --verbose

# Both debug and verbose
pnpm <tool> --debug --verbose
```

### Common Issues

#### Phase.dev Token Issues

```bash
# Check token format and permissions
pnpm validate-env status --debug

# Test Phase.dev connectivity
pnpm vercel-phase-prebuild --dry-run --verbose
```

#### Configuration Issues

```bash
# Validate all configurations
pnpm validate-config all --report

# Check specific app configuration
pnpm validate-env app --debug ./apps/web
```

#### Environment Loading Issues

```bash
# Debug environment loading
pnpm env-wrapper --debug --dry-run echo "test"

# Check environment status
pnpm validate-env status --verbose
```

### Environment Variables for Debugging

- `ENV_WRAPPER_DEBUG=true`: Enable wrapper debug output
- `ENV_WRAPPER_VERBOSE=true`: Enable wrapper verbose output
- `PHASE_DEBUG=true`: Enable Phase.dev debug output

## Integration with CI/CD

### GitHub Actions

```yaml
- name: Validate Environment
  run: pnpm validate-env all --strict --json

- name: Test CLI Tools
  run: pnpm test:cli-tools
```

### Vercel

```json
{
  "buildCommand": "pnpm vercel-phase-prebuild && pnpm build"
}
```

### Local Development

```bash
# Add to package.json scripts
{
  "scripts": {
    "dev": "env-wrapper next dev",
    "build": "env-wrapper next build",
    "validate": "validate-env app --strict"
  }
}
```

## Testing

Test all CLI tools:

```bash
pnpm test:cli-tools
```

This runs comprehensive tests to ensure all CLI tools are working correctly with proper error handling and help messages.