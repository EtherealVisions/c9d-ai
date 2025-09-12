# Environment Variable Setup Guide

This guide covers setting up environment variables for the C9D AI application using Phase.dev for secure configuration management, with fallback to local environment files.

## Table of Contents

- [Overview](#overview)
- [Phase.dev Setup](#phasedev-setup)
- [Local Development Setup](#local-development-setup)
- [Production Deployment](#production-deployment)
- [Environment Variable Reference](#environment-variable-reference)
- [Troubleshooting](#troubleshooting)

## Overview

The C9D AI application uses a hybrid approach for environment variable management:

1. **Phase.dev** (Recommended): Secure, centralized environment variable management
2. **Local .env files**: Fallback for development and when Phase.dev is unavailable
3. **Platform environment variables**: Direct configuration in deployment platforms (Vercel, etc.)

### Configuration Priority

The application loads environment variables in the following order (highest to lowest priority):

1. Platform environment variables (Vercel, etc.)
2. Local `.env.local` file
3. Phase.dev remote configuration
4. Local `.env` file
5. Default values (where applicable)

## Phase.dev Setup

Phase.dev provides secure, centralized environment variable management across different environments.

### 1. Create Phase.dev Account

1. Visit [Phase.dev Console](https://console.phase.dev)
2. Sign up for an account or log in
3. Create a new application

### 2. Configure Application

1. **Application Name**: Set to `AI.C9d.Web` (this must match exactly)
2. **Environments**: Create environments for:
   - `development`
   - `staging` (optional)
   - `production`

### 3. Add Environment Variables

In the Phase.dev console, add the following variables for each environment:

#### Required Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_publishable_key
CLERK_SECRET_KEY=sk_live_your_clerk_secret_key
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

#### Optional Variables

```bash
# Feature Flags
FEATURE_FLAGS=feature1,feature2
ENABLE_ANALYTICS=true

# External Services
API_KEY=your_external_api_key
EXTERNAL_SERVICE_URL=https://api.example.com

# Monitoring
SENTRY_DSN=your_sentry_dsn
LOG_LEVEL=info
```

### 4. Generate Service Token

1. In Phase.dev console, go to **Settings** → **Service Tokens**
2. Click **Generate New Token**
3. Give it a descriptive name (e.g., "Production Deployment")
4. Copy the generated token (you won't see it again)

### 5. Configure Service Token

#### For Local Development

Add to your `.env.local` file:

```bash
PHASE_SERVICE_TOKEN=your_phase_service_token_here
```

#### For Vercel Deployment

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add `PHASE_SERVICE_TOKEN` with your token value
4. Set it for all environments (Production, Preview, Development)

#### For Other Platforms

Add `PHASE_SERVICE_TOKEN` as an environment variable in your deployment platform.

## Local Development Setup

### 1. Copy Environment Template

```bash
# Copy the local development template
cp .env.local.example .env.local
```

### 2. Configure Required Services

#### Database Setup (Supabase Recommended)

1. Create a [Supabase](https://supabase.com) project
2. Go to **Settings** → **Database**
3. Copy the connection string and update `DATABASE_URL`
4. Go to **Settings** → **API**
5. Copy the URL and keys:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

#### Authentication Setup (Clerk)

1. Create a [Clerk](https://dashboard.clerk.com) application
2. Go to **API Keys**
3. Copy the keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
4. Go to **Webhooks** and create a webhook endpoint
5. Copy the `CLERK_WEBHOOK_SECRET`

### 3. Update .env.local

Edit `.env.local` with your actual values:

```bash
# Database (Supabase)
DATABASE_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your-key
CLERK_SECRET_KEY=sk_test_your-secret
CLERK_WEBHOOK_SECRET=whsec_your-webhook-secret

# Optional: Phase.dev integration
PHASE_SERVICE_TOKEN=your_phase_service_token
```

### 4. Verify Configuration

Run the configuration test:

```bash
pnpm test:phase
```

This will verify that all required environment variables are properly configured.

## Production Deployment

### Vercel Deployment

The application is optimized for Vercel deployment with the following configuration:

#### 1. Environment Variables

Set these in Vercel project settings:

```bash
# Required
PHASE_SERVICE_TOKEN=your_production_phase_token

# Optional: Override specific variables if needed
DATABASE_URL=your_production_database_url
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

#### 2. Build Configuration

The `vercel.json` file is pre-configured with:

- Custom build command using Turbo
- Phase.dev integration
- Proper output directory
- Security headers

#### 3. Deployment Process

1. Connect your repository to Vercel
2. Set the `PHASE_SERVICE_TOKEN` environment variable
3. Deploy - Vercel will automatically use the optimized build process

### Other Platforms

For other deployment platforms:

1. Set `PHASE_SERVICE_TOKEN` as an environment variable
2. Use the build command: `pnpm build`
3. Serve the `apps/web/.next` directory

## Environment Variable Reference

### Required Variables

| Variable | Description | Example | Source |
|----------|-------------|---------|--------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` | Supabase |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` | Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ...` | Supabase |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | `pk_test_...` | Clerk |
| `CLERK_SECRET_KEY` | Clerk secret key | `sk_test_...` | Clerk |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook secret | `whsec_...` | Clerk |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `PHASE_SERVICE_TOKEN` | Phase.dev service token | - | `ph_...` |
| `NODE_ENV` | Environment mode | `development` | `production` |
| `NEXT_PUBLIC_APP_URL` | Application base URL | `http://localhost:3000` | `https://app.com` |
| `LOG_LEVEL` | Logging level | `info` | `debug` |
| `FEATURE_FLAGS` | Comma-separated feature flags | - | `feature1,feature2` |

### Clerk URL Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in page URL | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up page URL | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Post-signin redirect | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Post-signup redirect | `/dashboard` |

## Troubleshooting

### Common Issues

#### 1. Phase.dev Connection Failed

**Error**: `Failed to load environment variables from Phase.dev`

**Solutions**:
- Verify `PHASE_SERVICE_TOKEN` is correct
- Check Phase.dev console for app name (`AI.C9d.Web`)
- Ensure network connectivity
- Check Phase.dev service status

**Fallback**: Application will use local environment variables

#### 2. Database Connection Failed

**Error**: `Database connection failed`

**Solutions**:
- Verify `DATABASE_URL` format: `postgresql://user:pass@host:port/db`
- Check database server is running
- Verify credentials and permissions
- Test connection with a database client

#### 3. Clerk Authentication Issues

**Error**: `Clerk authentication failed`

**Solutions**:
- Verify all Clerk keys are correct
- Check Clerk dashboard for application status
- Ensure webhook URL is accessible
- Verify domain configuration in Clerk

#### 4. Build Failures

**Error**: `Build failed with environment variable errors`

**Solutions**:
- Run `pnpm test:phase` to validate configuration
- Check all required variables are set
- Verify Phase.dev token has correct permissions
- Check build logs for specific missing variables

### Debug Mode

Enable debug logging by setting:

```bash
LOG_LEVEL=debug
NODE_ENV=development
```

This will provide detailed information about:
- Environment variable loading process
- Phase.dev API calls
- Configuration validation
- Fallback mechanisms

### Health Check

The application provides a health check endpoint at `/api/health` that includes:
- Configuration status
- Database connectivity
- Phase.dev integration status
- Required environment variables validation

### Getting Help

1. Check the [troubleshooting section](#troubleshooting) above
2. Review application logs for specific error messages
3. Test individual components:
   - Database: `pnpm test:db`
   - Phase.dev: `pnpm test:phase`
   - Authentication: `pnpm test:auth`
4. Consult service-specific documentation:
   - [Phase.dev Documentation](https://docs.phase.dev)
   - [Supabase Documentation](https://supabase.com/docs)
   - [Clerk Documentation](https://clerk.com/docs)
   - [Vercel Documentation](https://vercel.com/docs)

## Security Best Practices

1. **Never commit sensitive values** to version control
2. **Use Phase.dev or platform environment variables** for production
3. **Rotate tokens regularly** (especially service tokens)
4. **Use different keys** for development and production
5. **Limit token permissions** to minimum required scope
6. **Monitor token usage** in Phase.dev console
7. **Use HTTPS** for all external service communications
8. **Validate environment variables** at application startup

## Migration Guide

### From Local .env to Phase.dev

1. **Audit current variables**: List all variables in your `.env` files
2. **Create Phase.dev app**: Set up application with name `AI.C9d.Web`
3. **Add variables to Phase.dev**: Copy all production variables
4. **Generate service token**: Create token for your deployment
5. **Update deployment**: Add `PHASE_SERVICE_TOKEN` to your platform
6. **Test deployment**: Verify all variables are loaded correctly
7. **Remove sensitive .env files**: Keep only `.env.example` templates

### From Other Platforms to Phase.dev

1. **Export current variables**: Download from current platform
2. **Import to Phase.dev**: Add all variables to appropriate environments
3. **Update deployment configuration**: Add Phase.dev integration
4. **Test thoroughly**: Verify all functionality works
5. **Clean up old configuration**: Remove variables from old platform