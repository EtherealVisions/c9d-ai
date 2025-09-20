# Vercel Build Environment Variable Fix

## Problem Summary
The Vercel build is failing because:
1. Environment variables are available in Vercel but not accessible during the build process
2. The config package uses Node.js APIs that aren't compatible with Edge Runtime
3. The application tries to load complex Phase.dev configuration during build

## Root Cause
The main issue is that Turbo is warning about environment variables not being declared in `turbo.json`, which means they won't be available to the application during build.

## Solution Applied

### 1. Updated turbo.json
Added all required environment variables to the build task:
```json
"env": [
  "NODE_ENV", "VERCEL", "CI",
  "PHASE_SERVICE_TOKEN", "DATABASE_URL", "DIRECT_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY", "CLERK_WEBHOOK_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
  "DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD", "DIRECT_DB_PORT",
  "BASE_URL", "GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY", "GITHUB_WEBHOOK_SECRET", "GITHUB_WEBHOOK_URL"
]
```

### 2. Created Build-Safe Configuration
- Added build-time detection in config package
- Created stubs for Phase.dev functionality during build
- Made database client build-safe with mock values
- Added build-time checks to API routes

### 3. Fixed Error Exports
Added all missing error classes to `custom-errors.ts`

### 4. Environment Variable Fallbacks
Created `.env.build` with safe default values for build environment

## Expected Result
With these changes, the Vercel build should:
1. Have access to all required environment variables
2. Use build-safe stubs instead of trying to load Phase.dev configuration
3. Complete successfully without Edge Runtime compatibility issues

## Key Files Modified
- `turbo.json` - Environment variable declarations
- `packages/config/src/index.ts` - Build-safe exports
- `apps/web/lib/database/index.ts` - Build-safe database client
- `apps/web/lib/config/manager.ts` - Build-time detection
- `apps/web/app/layout.tsx` - Build-safe configuration loading
- `apps/web/lib/errors/custom-errors.ts` - Complete error exports

The build should now succeed in the Vercel environment.