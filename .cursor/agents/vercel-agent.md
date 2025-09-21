# Vercel Deployment Agent

## Purpose

This agent specializes in optimizing Next.js applications for Vercel deployment, ensuring best practices for performance, scalability, and reliability.

## Build Configuration

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "vercel-build": "prisma generate && prisma migrate deploy && next build",
    "postinstall": "prisma generate"
  }
}
```

### Next.js Configuration

```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for Vercel
  output: process.env.VERCEL ? undefined : "standalone",

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "your-cdn.com",
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
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: "/old-path",
        destination: "/new-path",
        permanent: true,
      },
    ];
  },

  // Rewrites for API proxying
  async rewrites() {
    return [
      {
        source: "/api/external/:path*",
        destination: "https://external-api.com/:path*",
      },
    ];
  },
};

export default nextConfig;
```

## Environment Configuration

### Vercel Environment Variables

```bash
# Production (via Vercel Dashboard)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."  # For migrations
CLERK_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."

# Preview (via Vercel Dashboard)
DATABASE_URL="postgresql://...staging"
CLERK_SECRET_KEY="sk_test_..."

# Development (local .env.development)
DATABASE_URL="postgresql://localhost..."
```

### Environment-Specific Configs

```typescript
// lib/config.ts
export const config = {
  // Use Vercel system env vars
  isProduction: process.env.VERCEL_ENV === "production",
  isPreview: process.env.VERCEL_ENV === "preview",
  isDevelopment: process.env.NODE_ENV === "development",

  // URLs
  appUrl: process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

  // Feature flags
  features: {
    analytics: process.env.VERCEL_ENV === "production",
    debugMode: process.env.VERCEL_ENV !== "production",
  },
};
```

## Edge Runtime Optimization

### Edge API Routes

```typescript
// app/api/edge/route.ts
import { NextRequest } from "next/server";

export const runtime = "edge"; // Enable Edge Runtime
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Edge-compatible code only
  // No Node.js APIs, use Web APIs

  const data = await fetch("https://api.example.com/data", {
    next: { revalidate: 60 }, // Cache for 60 seconds
  });

  return Response.json(await data.json());
}
```

### Middleware Configuration

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Geolocation
  const country = request.geo?.country || "US";

  // Add security headers
  const headers = new Headers(request.headers);
  headers.set("x-user-country", country);

  // A/B testing
  const bucket = Math.random() < 0.5 ? "a" : "b";

  const response = NextResponse.next({
    request: {
      headers,
    },
  });

  response.cookies.set("ab-test", bucket);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

## Database Optimization

### Connection Pooling

```typescript
// lib/db.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Limit connections for serverless
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// For serverless environments
if (process.env.VERCEL) {
  // Properly close connections
  process.on("beforeExit", async () => {
    await pool.end();
    await prisma.$disconnect();
  });
}

export { prisma };
```

### Query Optimization

```typescript
// Use Vercel Data Cache
import { unstable_cache } from "next/cache";

export const getCachedUser = unstable_cache(
  async (userId: string) => {
    return prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
  },
  ["user-cache"],
  {
    revalidate: 3600, // 1 hour
    tags: ["user"],
  }
);
```

## Performance Patterns

### Image Optimization

```tsx
import Image from "next/image";

export function OptimizedImage() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero"
      width={1200}
      height={600}
      priority // Load eagerly for LCP
      placeholder="blur"
      blurDataURL={shimmer(1200, 600)}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
}
```

### Font Optimization

```tsx
// app/layout.tsx
import { Inter, Roboto_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto-mono",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

### Dynamic Imports

```tsx
import dynamic from "next/dynamic";

// Lazy load heavy components
const HeavyChart = dynamic(() => import("@/components/HeavyChart"), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Disable SSR for client-only components
});

// Conditional loading
const AdminPanel = dynamic(() => import("@/components/AdminPanel"));

export function Dashboard({ isAdmin }: { isAdmin: boolean }) {
  return (
    <>
      {isAdmin && <AdminPanel />}
      <HeavyChart />
    </>
  );
}
```

## Monitoring & Analytics

### Vercel Analytics

```tsx
// app/layout.tsx
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### Custom Web Vitals

```typescript
// app/web-vitals.ts
import { onCLS, onINP, onLCP, onFCP, onTTFB } from "web-vitals";

export function reportWebVitals() {
  onCLS(sendToAnalytics);
  onINP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}

function sendToAnalytics(metric: any) {
  // Send to your analytics provider
  if (window.gtag) {
    window.gtag("event", metric.name, {
      value: Math.round(metric.value),
      metric_id: metric.id,
      metric_value: metric.value,
      metric_delta: metric.delta,
    });
  }
}
```

## Error Handling

### Global Error Boundary

```tsx
// app/error.tsx
"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="error-container">
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

## Deployment Checklist

### Pre-deployment

- [ ] Run `pnpm type-check`
- [ ] Run `pnpm lint`
- [ ] Run `pnpm build` locally
- [ ] Test with production environment variables
- [ ] Check bundle size with `@next/bundle-analyzer`
- [ ] Verify all environment variables are set in Vercel

### Post-deployment

- [ ] Check deployment logs for errors
- [ ] Verify database migrations ran successfully
- [ ] Test critical user paths
- [ ] Monitor Web Vitals scores
- [ ] Check error tracking for new issues
- [ ] Verify edge functions are working

### Performance Targets

- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] TTFB < 600ms
- [ ] Bundle size < 300KB (First Load JS)
