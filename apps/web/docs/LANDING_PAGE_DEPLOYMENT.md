# Landing Page Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the C9D.AI landing page to production using Vercel.

## Pre-Deployment Checklist

### 1. Code Quality Checks

```bash
# Run linting
pnpm lint

# Run type checking
pnpm type-check

# Run all tests
pnpm test
pnpm test:e2e
```

### 2. Performance Verification

```bash
# Build production bundle
pnpm build

# Analyze bundle size
pnpm analyze

# Test production build locally
pnpm start
```

### 3. Content Verification

1. Access content editor at `/admin/content-editor`
2. Verify all content is accurate and up-to-date
3. Export current content for backup
4. Test all CTAs and links

## Vercel Deployment Setup

### 1. Initial Configuration

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link
```

### 2. Environment Variables

Set up required environment variables in Vercel dashboard:

```env
# Required for Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=va_xxxxx

# Required for Authentication (from Phase.dev)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx

# Required for Database
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
DATABASE_URL=postgresql://xxxxx

# Optional
NEXT_PUBLIC_APP_URL=https://c9d.ai
```

### 3. Build Configuration

Create `vercel.json` in project root:

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/api/analytics/events/route.ts": {
      "maxDuration": 10
    }
  },
  "redirects": [
    {
      "source": "/",
      "has": [
        {
          "type": "host",
          "value": "www.c9d.ai"
        }
      ],
      "destination": "https://c9d.ai",
      "permanent": true
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

## Deployment Process

### 1. Preview Deployment

```bash
# Deploy to preview
vercel

# Test preview URL
# - Verify all features work
# - Check analytics tracking
# - Test responsive design
# - Validate Core Web Vitals
```

### 2. Production Deployment

```bash
# Deploy to production
vercel --prod

# Alternative: Deploy from GitHub
# Push to main branch for automatic deployment
git push origin main
```

### 3. Post-Deployment Verification

1. **Functional Testing**
   - [ ] Hero CTA works correctly
   - [ ] C9 capabilities showcase is interactive
   - [ ] Industry filtering functions properly
   - [ ] All links are valid
   - [ ] Analytics events are firing

2. **Performance Testing**
   - [ ] Run Lighthouse audit
   - [ ] Check Core Web Vitals in Vercel Analytics
   - [ ] Verify image optimization
   - [ ] Test loading speed from different regions

3. **Analytics Verification**
   - [ ] Vercel Analytics is receiving data
   - [ ] Custom events are tracked
   - [ ] Conversion goals are configured

## Monitoring Setup

### 1. Vercel Analytics

1. Navigate to Vercel Dashboard > Analytics
2. Enable Web Analytics
3. Configure conversion goals:
   - Consultation request clicks
   - Demo signups
   - API documentation views

### 2. Performance Monitoring

1. Set up Web Vitals alerts:
   ```javascript
   // Already implemented in performance-monitor.tsx
   reportWebVitals((metric) => {
     if (metric.rating === 'poor') {
       // Alert team
       console.error('Poor Web Vital:', metric)
     }
   })
   ```

2. Configure Vercel monitoring alerts for:
   - LCP > 2.5s
   - FID > 100ms
   - CLS > 0.1

### 3. Error Tracking

1. Set up error boundaries (already implemented)
2. Configure Vercel error tracking
3. Set up alerts for JavaScript errors

## A/B Testing Configuration

### 1. Edge Config Setup

```bash
# Create Edge Config
vercel edge-config create landing-page-experiments

# Add experiment flags
vercel edge-config add landing-page-experiments \
  hero_cta_variant=A \
  capability_layout=grid
```

### 2. Implement A/B Test

```typescript
// In components/hero-section.tsx
import { get } from '@vercel/edge-config'

export default async function HeroSection() {
  const ctaVariant = await get('hero_cta_variant')
  
  return (
    <section>
      {ctaVariant === 'B' ? (
        <Button>Get Started Free</Button>
      ) : (
        <Button>Request a Consultation</Button>
      )}
    </section>
  )
}
```

## Rollback Procedures

### 1. Quick Rollback

```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]
```

### 2. Git-based Rollback

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard [commit-hash]
git push --force origin main
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache and rebuild
   vercel --force
   
   # Check build logs
   vercel logs [deployment-url]
   ```

2. **Environment Variable Issues**
   - Verify all required vars are set in Vercel dashboard
   - Check for typos in variable names
   - Ensure production keys are used (not test keys)

3. **Performance Issues**
   - Check bundle size with `pnpm analyze`
   - Verify image optimization
   - Review third-party scripts

### Debug Mode

Enable debug mode for detailed logging:

```typescript
// In lib/analytics/events.ts
const DEBUG = process.env.NEXT_PUBLIC_DEBUG === 'true'

export function trackEvent(event: AnalyticsEvent) {
  if (DEBUG) {
    console.log('[Analytics Debug]', event)
  }
  // ... rest of implementation
}
```

## Maintenance Tasks

### Daily
- Monitor Core Web Vitals
- Check error logs
- Review conversion rates

### Weekly
- Analyze user behavior patterns
- Review A/B test results
- Update content as needed

### Monthly
- Full performance audit
- Security updates
- Dependency updates

## Security Considerations

1. **CSP Headers**
   ```javascript
   // In next.config.js
   const securityHeaders = [
     {
       key: 'Content-Security-Policy',
       value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel-analytics.com;"
     }
   ]
   ```

2. **API Rate Limiting**
   - Implement rate limiting for analytics endpoints
   - Use Vercel Edge Functions for DDoS protection

3. **Data Privacy**
   - Ensure GDPR compliance
   - Implement cookie consent if needed
   - Anonymize IP addresses in analytics

## Support and Escalation

### Support Channels
- **Technical Issues**: Create GitHub issue
- **Urgent Issues**: Contact DevOps team
- **Content Updates**: Use content editor or contact content team

### Escalation Path
1. Check documentation and logs
2. Contact team lead
3. Escalate to platform team if needed

## Conclusion

Following this deployment guide ensures a smooth, monitored, and optimized deployment of the C9D.AI landing page. Regular monitoring and maintenance will help maintain optimal performance and user experience.