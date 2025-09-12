# Vercel Deployment Guide

This guide covers deploying the C9D AI application to Vercel with Phase.dev integration and comprehensive CI/CD pipeline.

## Prerequisites

1. **Vercel Account**: Ensure you have a Vercel account and the Vercel CLI installed
2. **Phase.dev Account**: Set up your Phase.dev account with the application configured
3. **GitHub Integration**: Connect your repository to both GitHub Actions and Vercel
4. **Environment Variables**: Prepare all required environment variables for all environments

## Environment Variables Setup

### Required Environment Variables

The following environment variables must be configured in Vercel:

#### Phase.dev Integration
- `PHASE_SERVICE_TOKEN`: Your Phase.dev service token for the 'AI.C9d.Web' application

#### Database Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key

#### Authentication
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key
- `CLERK_SECRET_KEY`: Clerk secret key
- `CLERK_WEBHOOK_SECRET`: Clerk webhook secret

### CI/CD Environment Variables (GitHub Secrets)

For automated deployments via GitHub Actions:

#### Vercel Integration
- `VERCEL_TOKEN`: Vercel deployment token
- `VERCEL_TOKEN_STAGING`: Vercel token for staging deployments
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID

#### Turbo Remote Cache (Optional)
- `TURBO_TOKEN`: Turbo remote cache token
- `TURBO_TEAM`: Turbo team identifier

#### Environment-Specific Variables
For staging deployments, create separate variables with `_staging` suffix:
- `PHASE_SERVICE_TOKEN_STAGING`
- `DATABASE_URL_STAGING`
- `CLERK_PUBLISHABLE_KEY_STAGING`
- `CLERK_SECRET_KEY_STAGING`
- `SUPABASE_URL_STAGING`
- `SUPABASE_SERVICE_ROLE_KEY_STAGING`

### Configuring Environment Variables in Vercel

1. **Via Vercel Dashboard**:
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Add each required variable for Production, Preview, and Development environments

2. **Via Vercel CLI**:
   ```bash
   # Set Phase.dev service token
   vercel env add PHASE_SERVICE_TOKEN production
   
   # Set other required variables
   vercel env add DATABASE_URL production
   vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
   # ... continue for all required variables
   ```

## Phase.dev Integration

### How It Works

1. **Build Time**: During Vercel build, the application attempts to connect to Phase.dev using `PHASE_SERVICE_TOKEN`
2. **Fallback**: If Phase.dev is unavailable, the application falls back to Vercel environment variables
3. **Runtime**: The application uses cached environment variables with periodic refresh

### Phase.dev Configuration

Ensure your Phase.dev application is configured with:
- **App Name**: `AI.C9d.Web`
- **Environment**: Set to match your deployment environment (`production`, `preview`, `development`)
- **Service Token**: Generated and added to Vercel environment variables

## Deployment Environments

### Production Environment
- **Branch**: `main`
- **URL**: Production domain
- **Configuration**: `vercel.json`
- **Deployment**: Automatic via GitHub Actions on push to main

### Staging Environment
- **Branch**: `develop` or manual trigger
- **URL**: Preview URL
- **Configuration**: `vercel.staging.json`
- **Deployment**: Manual trigger via GitHub Actions workflow dispatch

## Deployment Process

### Automated CI/CD Pipeline (Recommended)

The project includes comprehensive GitHub Actions workflows for automated deployment:

#### CI Pipeline (`.github/workflows/ci.yml`)
Runs on every push and pull request:
1. **Setup and Validation**: Environment setup and workspace validation
2. **Type Checking**: TypeScript type validation across all packages
3. **Linting**: Code quality checks with ESLint
4. **Testing**: Unit and integration tests
5. **Phase.dev Integration Testing**: Validates Phase.dev connectivity
6. **Build Validation**: Ensures successful build across all packages
7. **Security Audit**: Dependency vulnerability scanning
8. **Integration Testing**: End-to-end integration validation

#### Deployment Pipeline (`.github/workflows/deploy.yml`)
Runs on push to main or manual trigger:
1. **Pre-deployment Validation**: Validates deployment readiness
2. **Build for Deployment**: Production build with Phase.dev integration
3. **Deploy to Vercel**: Automated deployment to Vercel
4. **Post-deployment Validation**: Comprehensive deployment validation
5. **Rollback Capability**: Automatic rollback on validation failure

### Manual Deployment

#### Pre-deployment Validation
```bash
# Validate deployment readiness
pnpm deploy:validate:pre
```

#### Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

#### Post-deployment Validation
```bash
# Validate deployment (replace URL with actual deployment URL)
pnpm deploy:validate:post https://your-app.vercel.app
```

## Build Process

### Enhanced Build Script

The custom build script (`scripts/vercel-build.js`) performs comprehensive build validation:

1. **Phase.dev Validation**: Checks service token availability and validity
2. **Connection Test**: Tests Phase.dev API connectivity with timeout handling
3. **Environment Validation**: Validates all required environment variables
4. **Turbo Build**: Executes monorepo build with enhanced error handling
5. **Output Validation**: Verifies build artifacts and required files
6. **Diagnostics Generation**: Creates detailed diagnostics on failure

### Deployment Validation

#### Pre-deployment Checks (`scripts/deployment-validation.js`)
- Build output validation
- Environment variable verification
- Phase.dev configuration validation
- Package manager verification

#### Post-deployment Checks
- Main page accessibility testing
- Health endpoint validation
- API endpoint functionality testing
- Security header verification
- Performance validation
- Database connectivity testing
- Phase.dev integration status verification

## Troubleshooting

### Common Issues

#### Build Failures

1. **Missing Environment Variables**:
   ```
   Error: Missing required environment variables: DATABASE_URL, CLERK_SECRET_KEY
   ```
   **Solution**: Add missing environment variables in Vercel dashboard

2. **Phase.dev Connection Timeout**:
   ```
   Warning: Phase.dev connection failed: Phase.dev connection timeout
   ```
   **Solution**: This is non-fatal; the build continues with Vercel environment variables

3. **Turbo Build Errors**:
   ```
   Error: Turbo build failed
   ```
   **Solution**: Check build logs for specific package errors

#### Runtime Issues

1. **Environment Variables Not Available**:
   - Verify variables are set for the correct environment (production/preview/development)
   - Check Phase.dev application configuration
   - Ensure service token has correct permissions

2. **Phase.dev API Errors**:
   - Verify service token is valid and not expired
   - Check Phase.dev application name matches `AI.C9d.Web`
   - Ensure network connectivity to Phase.dev API

### Debug Information

The build script provides comprehensive debug information on failure:
- Node.js version and platform details
- Working directory and environment type
- Phase.dev token presence and validation
- Memory usage and system resources
- Build diagnostics with suggested solutions
- Cache status and configuration

### Debug Commands

```bash
# Cache management
pnpm cache:info          # View cache information
pnpm cache:clean         # Clean all caches
pnpm cache:report        # Generate cache report

# Deployment validation
pnpm deploy:validate:pre # Pre-deployment validation
pnpm deploy:validate:post <url> # Post-deployment validation

# Phase.dev testing
pnpm test:phase          # Test Phase.dev integration
pnpm test:integration    # Full integration test
```

### Logs and Monitoring

1. **Build Logs**: Available in Vercel dashboard under "Functions" → "Build Logs"
2. **Runtime Logs**: Available in Vercel dashboard under "Functions" → "Edge Logs"
3. **Phase.dev Logs**: Check Phase.dev dashboard for API access logs

## Performance Optimization

### Caching Strategy

- **Static Assets**: Cached for 1 year with immutable headers
- **API Routes**: No caching for dynamic content
- **Environment Variables**: Cached for 5 minutes with background refresh

### Build Optimization

- **Turbo Caching**: Leverages Turbo's build cache for faster builds
- **Package Optimization**: Uses optimized imports for large packages
- **Bundle Splitting**: Configured for optimal chunk sizes

## Security Considerations

### Headers

The application includes security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: origin-when-cross-origin`

### Environment Variables

- Never commit environment variables to version control
- Use Phase.dev for sensitive configuration management
- Rotate service tokens regularly
- Use different tokens for different environments

## Monitoring and Alerts

### Recommended Monitoring

1. **Vercel Analytics**: Enable for performance monitoring
2. **Error Tracking**: Integrate with Sentry or similar service
3. **Uptime Monitoring**: Set up external uptime checks
4. **Phase.dev Monitoring**: Monitor Phase.dev API availability

### Health Checks

The application includes health check endpoints:
- `/api/health`: Basic application health
- `/api/health/config`: Configuration validation status

## Rollback Strategy

### Automated Rollback

The CI/CD pipeline includes automated rollback capabilities:
1. **Validation Failure**: Automatic rollback triggered on post-deployment validation failure
2. **Health Check Failure**: Continuous monitoring with automatic rollback
3. **Manual Trigger**: Rollback can be triggered manually via GitHub Actions

### Manual Rollback

#### Via GitHub Actions
1. Go to GitHub Actions
2. Select "Deploy to Vercel" workflow
3. Click "Run workflow"
4. Select rollback option

#### Via Vercel Dashboard
1. Go to Vercel dashboard
2. Navigate to "Deployments"
3. Select a previous successful deployment
4. Click "Promote to Production"

#### Via Vercel CLI
```bash
# List recent deployments
vercel ls

# Promote a specific deployment
vercel promote <deployment-url>
```

### Rollback Validation

After rollback, the system automatically:
1. Validates the rolled-back deployment
2. Runs health checks
3. Updates deployment status
4. Notifies stakeholders

## Support

For deployment issues:
1. Check Vercel build logs
2. Review Phase.dev API logs
3. Verify environment variable configuration
4. Test Phase.dev connectivity locally
5. Contact support with specific error messages and deployment URLs