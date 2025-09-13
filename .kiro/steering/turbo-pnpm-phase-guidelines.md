# Turbo, pnpm, and Phase.dev Guidelines

## Overview
This document defines mandatory guidelines for using Turborepo, pnpm, and phase.dev across the C9D AI platform monorepo. These tools provide efficient build orchestration, package management, and environment variable management for our multi-app architecture.

## Monorepo Architecture

### Project Structure
```
root/
├── apps/
│   ├── web/          # Main Next.js application (AI.C9d.Web)
│   ├── docs/         # Documentation site (AI.C9d.Docs)  
│   └── api/          # API services (AI.C9d.API)
├── packages/
│   ├── ui/           # Shared UI components
│   ├── types/        # Shared TypeScript types
│   └── config/       # Configuration utilities
├── turbo.json        # Turborepo configuration
├── pnpm-workspace.yaml
└── package.json      # Root package.json
```

## Turborepo Standards

### Mandatory Turbo Usage
- **ALL commands must use Turbo for orchestration at the root level**
- **Individual apps/packages should define their scripts for Turbo to execute**
- **Never run commands directly in apps/packages - always through Turbo**

### Turbo Configuration Requirements
Every `turbo.json` must define these standard tasks:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "test:run": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "test:dev": {
      "cache": false,
      "persistent": true
    },
    "test:watch": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  }
}
```

### Test Execution Standards (MANDATORY)

**CRITICAL REQUIREMENT**: All test commands MUST terminate gracefully without manual intervention.

#### Test Command Behavior Rules
1. **Default Test Command**: `pnpm test` MUST run tests once and exit (no watch mode)
2. **Explicit Watch Mode**: Watch mode only available through `pnpm test:dev` or `pnpm test:watch`
3. **CI/CD Compatibility**: All test commands must work in automated environments
4. **Graceful Termination**: Tests must complete with proper exit codes
5. **No Manual Intervention**: Never require Ctrl+C to terminate

#### Correct Test Command Patterns
```bash
# ✅ CORRECT: Runs once and exits
pnpm test                   # Uses vitest run
pnpm test:run              # Explicit run mode
pnpm test --filter=web     # Runs specific app tests once

# ✅ CORRECT: Explicit watch mode for development
pnpm test:dev              # Uses vitest --watch
pnpm test:watch            # Alternative watch command

# ❌ INCORRECT: Default command should not watch
pnpm test                  # Should NOT use vitest (watch mode)
```

### Standard Turbo Commands

#### Root Level Commands (REQUIRED)
```bash
# Development
pnpm dev                    # Start all apps in development
pnpm dev --filter=web       # Start specific app
pnpm dev --filter=@c9d/*    # Start all apps in scope

# Building
pnpm build                  # Build all apps and packages
pnpm build --filter=web     # Build specific app
pnpm build --filter=@c9d/*  # Build all in scope

# Testing
pnpm test                   # Run all tests once (default behavior)
pnpm test --filter=web      # Test specific app once
pnpm test:run               # Run tests once (explicit CI mode)
pnpm test:dev               # Watch mode for development (explicit)
pnpm test:watch             # Alternative watch mode command

# Code Quality
pnpm lint                   # Lint all code
pnpm lint --filter=web      # Lint specific app
pnpm typecheck              # Type check all TypeScript
pnpm format                 # Format all code with Prettier

# Utilities
pnpm clean                  # Clean all build artifacts
pnpm clean --filter=web     # Clean specific app
```

#### Parallel Execution (MANDATORY for CI)
```bash
# Run tasks in parallel across all workspaces
pnpm build --parallel
pnpm test --parallel
pnpm lint --parallel

# Limit concurrency for resource management
pnpm build --concurrency=2
pnpm test --concurrency=4
```

## pnpm Standards

### Package Manager Requirements
- **pnpm is the ONLY allowed package manager**
- **Never use npm or yarn commands**
- **All installations must use pnpm**
- **Use pnpm workspaces for monorepo management**

### pnpm Workspace Configuration
```yaml
# pnpm-workspace.yaml (REQUIRED)
packages:
  - 'apps/*'
  - 'packages/*'
```

### Dependency Management Rules

#### Root Dependencies (package.json)
```json
{
  "devDependencies": {
    "@turbo/gen": "^1.10.0",
    "turbo": "^1.10.0",
    "prettier": "^3.0.0",
    "eslint": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```

#### App/Package Dependencies
- **Shared dependencies go in root `package.json`**
- **App-specific dependencies go in app's `package.json`**
- **Use workspace protocol for internal packages: `"@c9d/ui": "workspace:*"`**

### pnpm Commands (MANDATORY)

#### Installation
```bash
# Root level (ALWAYS use this)
pnpm install

# Add dependency to specific workspace
pnpm add react --filter=web
pnpm add -D vitest --filter=web

# Add dependency to root
pnpm add -w turbo
pnpm add -D -w prettier

# Add workspace dependency
pnpm add @c9d/ui --filter=web
```

#### Workspace Management
```bash
# List all workspaces
pnpm list --recursive

# Run command in specific workspace
pnpm --filter=web dev
pnpm --filter=@c9d/ui build

# Run command in multiple workspaces
pnpm --filter="./apps/*" build
pnpm --filter="@c9d/*" test
```

## Phase.dev Integration (MANDATORY)

### Context Configuration
Each app/package MUST use its designated phase.dev context:

#### Apps Context Mapping
- **apps/web**: `AI.C9d.Web`
- **apps/docs**: `AI.C9d.Docs`
- **apps/api**: `AI.C9d.API`

#### Package Scripts with Phase.dev
Every app's `package.json` must include phase.dev in all scripts:

```json
{
  "name": "@c9d/web",
  "scripts": {
    "dev": "phase run --context AI.C9d.Web -- next dev",
    "build": "phase run --context AI.C9d.Web -- next build",
    "start": "phase run --context AI.C9d.Web -- next start",
    "test": "phase run --context AI.C9d.Web -- vitest run",
    "test:run": "phase run --context AI.C9d.Web -- vitest run",
    "test:dev": "phase run --context AI.C9d.Web -- vitest --watch",
    "test:watch": "phase run --context AI.C9d.Web -- vitest --watch",
    "lint": "phase run --context AI.C9d.Web -- next lint",
    "typecheck": "phase run --context AI.C9d.Web -- tsc --noEmit"
  }
}
```

#### Environment Variable Management
- **ALL environment variables must be managed through phase.dev**
- **NO `.env` files should be committed to the repository**
- **Use phase.dev contexts for environment separation**

```bash
# Set environment variables
phase secrets set DATABASE_URL "postgresql://..." --context AI.C9d.Web
phase secrets set NEXT_PUBLIC_API_URL "https://api.example.com" --context AI.C9d.Web

# List environment variables
phase secrets list --context AI.C9d.Web

# Run with specific context
phase run --context AI.C9d.Web -- pnpm dev
```

### Phase.dev in CI/CD
```yaml
# .github/workflows/ci.yml
- name: Install Phase CLI
  run: curl -fsSL https://get.phase.dev | bash

- name: Run tests with Phase
  run: |
    phase run --context AI.C9d.Web -- pnpm test --filter=web
    phase run --context AI.C9d.API -- pnpm test --filter=api
```

## Command Execution Patterns

### Development Workflow (MANDATORY)
```bash
# 1. Install dependencies (root only)
pnpm install

# 2. Start development (through Turbo)
pnpm dev                    # All apps
pnpm dev --filter=web       # Specific app

# 3. Run tests (through Turbo)
pnpm test --filter=web      # Specific app tests
pnpm test                   # All tests

# 4. Build (through Turbo)
pnpm build --filter=web     # Specific app
pnpm build                  # All apps
```

### Production Deployment (MANDATORY)
```bash
# 1. Clean install
pnpm install --frozen-lockfile

# 2. Type checking
pnpm typecheck

# 3. Linting
pnpm lint

# 4. Testing
pnpm test:run

# 5. Building
pnpm build

# All with phase.dev contexts automatically applied
```

### Package Development (MANDATORY)
```bash
# Develop shared package
pnpm dev --filter=@c9d/ui

# Test package
pnpm test --filter=@c9d/ui

# Build package
pnpm build --filter=@c9d/ui

# Use in app (automatic through workspace protocol)
# No additional steps needed
```

## Performance Optimization

### Turbo Caching (MANDATORY)
- **Enable remote caching for CI/CD**
- **Configure proper cache inputs and outputs**
- **Use cache fingerprinting for dependencies**

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["src/**/*.tsx", "src/**/*.ts", "package.json"],
      "outputs": [".next/**", "!.next/cache/**"]
    }
  }
}
```

### pnpm Optimization (MANDATORY)
```bash
# Use frozen lockfile in CI
pnpm install --frozen-lockfile

# Prune dev dependencies for production
pnpm install --prod --frozen-lockfile

# Use store for faster installs
pnpm config set store-dir ~/.pnpm-store
```

## Error Prevention

### Common Anti-Patterns (FORBIDDEN)
```bash
# ❌ NEVER do these:
npm install                 # Use pnpm instead
yarn add package           # Use pnpm instead
cd apps/web && npm run dev  # Use turbo filter instead
node scripts/build.js      # Use turbo pipeline instead

# ✅ ALWAYS do these:
pnpm install
pnpm add package --filter=web
pnpm dev --filter=web
pnpm build
```

### Validation Scripts (REQUIRED)
Add to root `package.json`:

```json
{
  "scripts": {
    "validate": "pnpm typecheck && pnpm lint && pnpm test:run",
    "validate:ci": "pnpm install --frozen-lockfile && pnpm validate && pnpm build",
    "precommit": "pnpm validate --filter=[HEAD~1]"
  }
}
```

## Troubleshooting

### Common Issues and Solutions

#### pnpm Installation Issues
```bash
# Clear pnpm cache
pnpm store prune

# Reinstall all dependencies
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

#### Turbo Cache Issues
```bash
# Clear turbo cache
pnpm clean
turbo prune

# Force rebuild without cache
pnpm build --force
```

#### Phase.dev Context Issues
```bash
# Verify context exists
phase auth status
phase contexts list

# Re-authenticate if needed
phase auth login
```

### Debugging Commands
```bash
# Debug turbo execution
pnpm build --dry-run
pnpm build --graph

# Debug pnpm workspace resolution
pnpm list --recursive --depth=0

# Debug phase.dev environment
phase secrets list --context AI.C9d.Web
phase run --context AI.C9d.Web -- env
```

## Compliance Checklist

### Before Every Commit (MANDATORY)
- [ ] All commands use pnpm (never npm/yarn)
- [ ] All app commands go through Turbo
- [ ] All apps use correct phase.dev context
- [ ] No `.env` files committed
- [ ] `pnpm validate` passes
- [ ] Turbo cache is working

### Before Every Deploy (MANDATORY)
- [ ] `pnpm install --frozen-lockfile` succeeds
- [ ] `pnpm validate:ci` passes
- [ ] All phase.dev contexts configured
- [ ] Remote caching enabled
- [ ] Build artifacts are correct

## Enforcement

### Pre-commit Hooks (REQUIRED)
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "pnpm precommit"
    }
  }
}
```

### CI/CD Validation (REQUIRED)
Every CI pipeline must validate:
1. Only pnpm is used (no npm/yarn)
2. All commands go through Turbo
3. Phase.dev contexts are properly configured
4. No environment variables in code

This ensures consistent, efficient, and secure development practices across the entire C9D AI platform.