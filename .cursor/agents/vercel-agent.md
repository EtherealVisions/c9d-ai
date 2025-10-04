# Vercel Deployment Agent

## Purpose

This agent specializes in optimizing Next.js applications for Vercel deployment with Drizzle ORM, ensuring best practices for performance, scalability, and reliability.

## Build Configuration

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "env-wrapper next dev -p 3008",
    "build": "next build",
    "start": "next start -p 3008",
    "vercel-build": "pnpm db:generate && pnpm db:migrate && next build",
    "postinstall": "pnpm db:generate"
  }
}
```

### Drizzle Build Integration

```json
{
  "scripts": {
    // Database commands using env-wrapper
    "db:generate": "env-wrapper -- drizzle-kit generate",
    "db:migrate": "env-wrapper -- drizzle-kit migrate",
    "db:push": "env-wrapper -- drizzle-kit push",
    
    // Production deployment
    "vercel-build": "pnpm db:ensure-wrapper && pnpm db:generate && pnpm db:migrate && next build",
    
    // Development
    "dev:db": "pnpm db:generate && pnpm db:push",
    "postinstall": "pnpm db:ensure-wrapper && pnpm db:generate"
  }
}
```

### Next.js Configuration with Drizzle

```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for Vercel
  output: process.env.VERCEL ? undefined : "standalone",
  
  // Ensure database types are available
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't include server-only modules in client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ]
  },

  // Environment-specific redirects
  async redirects() {
    return [
      {
        source: "/admin",
        has: [
          {
            type: "host",
            value: "(?!admin\\.)",
          },
        ],
        destination: "https://admin.coordinated.app/admin",
        permanent: false,
      },
    ]
  },

  // Experimental features for Drizzle
  experimental: {
    serverComponentsExternalPackages: ["drizzle-orm", "postgres"],
  },
}

export default nextConfig
```

## Environment Configuration for Drizzle

### Vercel Environment Variables

```bash
# Production (via Vercel Dashboard)
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
DIRECT_URL="postgresql://user:pass@host:5432/db?sslmode=require" # For migrations

# Phase.dev integration
PHASE_SERVICE_TOKEN="pss_service:v1:..."
PHASE_APP_ENV="production"
PHASE_HOST="https://api.phase.dev"

# Authentication
CLERK_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# Redis (if using caching)
REDIS_URL="redis://default:password@host:6379"
REDIS_TOKEN="..."
```

### Build-Time Environment Loading

```typescript
// lib/env.ts
import { loadEnvConfig } from '@next/env'

// Load environment variables at build time
const projectDir = process.cwd()
loadEnvConfig(projectDir)

// Validate required variables
const requiredEnvVars = [
  'DATABASE_URL',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
] as const

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}

// Export typed environment
export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  DIRECT_URL: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  isProduction: process.env.VERCEL_ENV === 'production',
  isPreview: process.env.VERCEL_ENV === 'preview',
} as const
```

## Database Connection for Serverless

### Optimized Drizzle Connection

```typescript
// lib/db/connection.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Different configs for different environments
const connectionString = process.env.DATABASE_URL!

let queryClient: postgres.Sql

if (process.env.VERCEL) {
  // Vercel serverless optimizations
  queryClient = postgres(connectionString, {
    max: 1, // Serverless should use minimal connections
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: { rejectUnauthorized: false }, // Required for some providers
    prepare: false, // Disable prepared statements for serverless
  })
} else {
  // Local development
  queryClient = postgres(connectionString, {
    max: 10,
    idle_timeout: 60,
  })
}

export const db = drizzle(queryClient, { schema })

// Ensure proper cleanup in serverless
if (process.env.VERCEL) {
  process.on('exit', () => queryClient.end())
}
```

### Migration Strategy

```typescript
// scripts/migrate-production.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

async function runMigrations() {
  console.log('Running migrations...')
  
  const sql = postgres(process.env.DATABASE_URL!, { 
    max: 1,
    ssl: { rejectUnauthorized: false }
  })
  
  const db = drizzle(sql)
  
  try {
    await migrate(db, { 
      migrationsFolder: './apps/web/lib/db/migrations',
      migrationsTable: 'drizzle_migrations',
    })
    console.log('Migrations completed successfully')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

runMigrations()
```

## Edge Runtime Optimization

### Edge-Compatible Database Queries

```typescript
// app/api/edge/route.ts
import { NextRequest } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '@/lib/db/schema'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// Use Neon for Edge Runtime compatibility
const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

export async function GET(request: NextRequest) {
  try {
    // Edge-compatible query
    const users = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
      })
      .from(schema.users)
      .limit(10)
    
    return Response.json({ success: true, data: users })
  } catch (error) {
    console.error('Edge function error:', error)
    return Response.json(
      { success: false, error: 'Database error' },
      { status: 500 }
    )
  }
}
```

### Middleware with Database Access

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAuth } from '@clerk/nextjs/server'

export async function middleware(request: NextRequest) {
  // Don't query database in middleware - too expensive
  // Use JWT claims or external cache instead
  
  const { userId } = await verifyAuth(request)
  
  if (!userId && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

## Performance Patterns

### Incremental Static Regeneration with Database

```typescript
// app/instructors/[id]/page.tsx
import { notFound } from 'next/navigation'
import { db } from '@/lib/db/connection'
import { users, instructorProfiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Generate static paths at build time
export async function generateStaticParams() {
  const instructors = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'INSTRUCTOR'))
    .limit(100) // Pre-build top 100
  
  return instructors.map((instructor) => ({
    id: instructor.id,
  }))
}

// Revalidate every hour
export const revalidate = 3600

export default async function InstructorPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const instructor = await db.query.users.findFirst({
    where: eq(users.id, params.id),
    with: {
      instructorProfile: true,
    },
  })
  
  if (!instructor || instructor.role !== 'INSTRUCTOR') {
    notFound()
  }
  
  return <InstructorProfile instructor={instructor} />
}
```

### Data Cache with Drizzle

```typescript
// lib/cache.ts
import { unstable_cache } from 'next/cache'
import { db } from '@/lib/db/connection'
import { instructorProfiles } from '@/lib/db/schema'

export const getCachedInstructors = unstable_cache(
  async (city: string) => {
    console.log('Cache miss - fetching from database')
    
    return await db.query.instructorProfiles.findMany({
      where: eq(instructorProfiles.city, city),
      with: {
        user: true,
      },
      limit: 50,
    })
  },
  ['instructors-by-city'],
  {
    revalidate: 300, // 5 minutes
    tags: ['instructors'],
  }
)

// Invalidate cache when data changes
export async function updateInstructor(id: string, data: any) {
  await db.update(instructorProfiles).set(data).where(eq(instructorProfiles.id, id))
  
  // Revalidate cache
  revalidateTag('instructors')
}
```

## Deployment Configuration

### vercel.json with Drizzle

```json
{
  "buildCommand": "pnpm vercel-build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/api/*/route.ts": {
      "maxDuration": 10
    },
    "app/api/admin/*/route.ts": {
      "maxDuration": 30
    }
  },
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    }
  ],
  "env": {
    "DATABASE_URL": "@database-url",
    "DIRECT_URL": "@database-url-direct",
    "PHASE_SERVICE_TOKEN": "@phase-service-token"
  },
  "build": {
    "env": {
      "DATABASE_URL": "@database-url",
      "DIRECT_URL": "@database-url-direct",
      "PHASE_SERVICE_TOKEN": "@phase-service-token",
      "NODE_ENV": "production"
    }
  }
}
```

### Build Optimization

```bash
# .vercelignore
# Ignore test files
**/*.test.ts
**/*.spec.ts
__tests__
e2e

# Ignore development files
.env.development
.env.local
docker-compose.yml

# Ignore documentation
docs
*.md

# Keep migrations
!apps/web/lib/db/migrations
```

## Monitoring & Error Handling

### Sentry Integration with Drizzle

```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs'

// Wrap database operations
export async function withMonitoring<T>(
  operation: () => Promise<T>,
  context: { operation: string; [key: string]: any }
): Promise<T> {
  const transaction = Sentry.startTransaction({
    name: context.operation,
    op: 'db.query',
  })
  
  try {
    const result = await operation()
    transaction.setStatus('ok')
    return result
  } catch (error) {
    transaction.setStatus('internal_error')
    Sentry.captureException(error, {
      contexts: {
        database: context,
      },
    })
    throw error
  } finally {
    transaction.finish()
  }
}

// Usage
const users = await withMonitoring(
  () => db.select().from(users).limit(10),
  { operation: 'list-users', limit: 10 }
)
```

## Deployment Checklist

### Pre-deployment

- [ ] Run `pnpm db:generate` to ensure latest schema
- [ ] Test migrations locally with `pnpm db:migrate`
- [ ] Run `pnpm type-check` - no TypeScript errors
- [ ] Run `pnpm lint` - code quality check
- [ ] Run `pnpm test:integration` - database tests pass
- [ ] Run `pnpm build` locally - build succeeds
- [ ] Check bundle size with `@next/bundle-analyzer`
- [ ] Verify all environment variables in Vercel dashboard
- [ ] Test with production database connection locally

### Deployment Commands

```bash
# Local validation
pnpm validate-all

# Preview deployment
vercel --env preview

# Production deployment
vercel --prod

# Run migrations after deployment
pnpm db:migrate:prod
```

### Post-deployment

- [ ] Check deployment logs for migration success
- [ ] Verify database schema is updated
- [ ] Test critical user paths
- [ ] Monitor error rates in Sentry
- [ ] Check Web Vitals scores
- [ ] Verify Edge functions are working
- [ ] Test database connection pooling
- [ ] Monitor query performance

### Performance Targets

- [ ] LCP < 2.5s
- [ ] FID < 100ms  
- [ ] CLS < 0.1
- [ ] TTFB < 600ms
- [ ] Database query p95 < 100ms
- [ ] API route p95 < 200ms
- [ ] Bundle size < 300KB (First Load JS)

## Rollback Strategy

### Database Rollback

```bash
# Create rollback script
# scripts/rollback-migration.ts
import { sql } from 'drizzle-orm'

export async function rollbackLastMigration() {
  // Get last migration
  const lastMigration = await db.execute(sql`
    SELECT id, hash FROM drizzle_migrations 
    ORDER BY created_at DESC 
    LIMIT 1
  `)
  
  // Execute down migration
  // ... implementation
}
```

### Vercel Instant Rollback

```bash
# List deployments
vercel list

# Rollback to previous
vercel rollback [deployment-url]

# Rollback database if needed
pnpm db:rollback
```