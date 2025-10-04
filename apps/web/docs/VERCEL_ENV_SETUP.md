# Vercel Environment Variables Setup Guide

## Important: Environment Variable Configuration

The build logs show that environment variables are not being properly loaded in Vercel. The variables are appearing as literal `$VARIABLE_NAME` strings instead of their actual values.

## Problem

Variables like `DATABASE_URL`, `REDIS_URL`, `PHASE_SERVICE_TOKEN` are showing as `$DATABASE_URL`, `$REDIS_URL`, `$PHASE_SERVICE_TOKEN` in the build logs, which means Vercel is not injecting the actual values.

## Solution

### 1. Remove vercel.json Environment Variable Definitions

The `vercel.json` file should NOT contain `env` or `build.env` sections with `$VARIABLE_NAME` syntax. This tells Vercel to use the literal string `$VARIABLE_NAME` as the value.

❌ **Wrong** (in vercel.json):
```json
{
  "env": {
    "DATABASE_URL": "$DATABASE_URL"
  }
}
```

✅ **Correct**: Remove the `env` and `build.env` sections entirely from vercel.json

### 2. Set Environment Variables in Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable with its actual value (not `$VARIABLE_NAME`)

Required variables:
- `DATABASE_URL` - Your PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key
- `CLERK_SECRET_KEY` - Your Clerk secret key
- `CLERK_WEBHOOK_SECRET` - Your Clerk webhook secret
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

Optional variables:
- `REDIS_URL` - Your Redis connection URL
- `REDIS_TOKEN` - Your Redis authentication token
- `PHASE_SERVICE_TOKEN` - Your Phase.dev service token (if using Phase.dev)
- `PHASE_ENV` - Phase environment (production, development, etc.)

### 3. Environment Variable Scopes

When adding variables in Vercel, you can set them for different environments:
- **Production**: Applied to production deployments
- **Preview**: Applied to preview deployments
- **Development**: Applied when using `vercel dev`

For sensitive variables like `CLERK_SECRET_KEY`, only add them to Production and Preview, not Development.

### 4. Verify Environment Variables

After setting up, you can verify by:

1. Triggering a new deployment
2. Checking the build logs for the environment variable test output
3. Looking for the "Environment Variable Test" section in the logs

Successful output should show:
```
✅ DATABASE_URL: postgresql... (length: 150)
✅ NEXT_PUBLIC_SUPABASE_URL: https://abc... (length: 55)
```

Not:
```
⚠️  DATABASE_URL: LITERAL VARIABLE ($DATABASE_URL)
```

### 5. Phase.dev Integration (Optional)

If using Phase.dev for secret management:

1. Set `PHASE_SERVICE_TOKEN` in Vercel with your actual Phase.dev service token
2. Ensure the token has the correct permissions
3. The prebuild script will attempt to load secrets from Phase.dev

### 6. Troubleshooting

If variables are still not loading:

1. **Check Variable Names**: Ensure no typos in variable names
2. **Check Scopes**: Ensure variables are set for the correct environment (Production/Preview)
3. **Check Values**: Ensure values don't start with `$` unless they're meant to reference another variable
4. **Clear Cache**: Try redeploying with "Force new deployment" option
5. **Check Logs**: Look for the "Environment Variable Test" section in build logs

### 7. Local Development

For local development, create a `.env.local` file in `apps/web/`:

```env
DATABASE_URL=your-local-database-url
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
# ... other variables
```

Never commit `.env.local` to version control.