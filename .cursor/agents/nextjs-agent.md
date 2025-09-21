# Next.js Best Practices Agent

## Purpose

This agent specializes in implementing Next.js 14+ App Router best practices, focusing on performance, SEO, accessibility, and maintainable code patterns.

## App Router Architecture

### File Structure

```
apps/web/
├── app/
│   ├── (auth)/              # Route group for auth pages
│   │   ├── login/
│   │   └── signup/
│   ├── (marketing)/         # Route group for marketing
│   │   ├── page.tsx        # Homepage
│   │   ├── about/
│   │   └── pricing/
│   ├── (app)/              # Route group for app
│   │   ├── dashboard/
│   │   └── settings/
│   ├── api/                # API routes
│   ├── layout.tsx          # Root layout
│   ├── error.tsx           # Error boundary
│   ├── not-found.tsx       # 404 page
│   └── global-error.tsx    # Global error boundary
├── components/
│   ├── ui/                 # Reusable UI components
│   ├── features/           # Feature-specific components
│   └── layouts/            # Layout components
├── lib/                    # Utilities and configs
├── hooks/                  # Custom React hooks
└── types/                  # TypeScript types
```

### Server Components (Default)

```tsx
// app/dashboard/page.tsx
import { auth } from "@clerk/nextjs";
import { prisma } from "@/lib/db";
import { DashboardClient } from "./dashboard-client";

// Server Component - runs on server
export default async function DashboardPage() {
  const { userId } = auth();

  if (!userId) {
    redirect("/login");
  }

  // Direct database access
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { profile: true },
  });

  // Fetch data in parallel
  const [bookings, stats] = await Promise.all([getRecentBookings(userId), getUserStats(userId)]);

  return (
    <div>
      <h1>Welcome, {user.firstName}</h1>
      {/* Pass data to Client Component */}
      <DashboardClient initialData={{ bookings, stats }} />
    </div>
  );
}

// Loading state
export function Loading() {
  return <DashboardSkeleton />;
}
```

### Client Components

```tsx
// app/dashboard/dashboard-client.tsx
"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "./actions";

interface Props {
  initialData: {
    bookings: Booking[];
    stats: UserStats;
  };
}

export function DashboardClient({ initialData }: Props) {
  const [isPending, startTransition] = useTransition();
  const [optimisticName, setOptimisticName] = useState("");

  const handleUpdate = async (formData: FormData) => {
    const name = formData.get("name") as string;

    // Optimistic update
    startTransition(() => {
      setOptimisticName(name);
    });

    // Server action
    await updateProfile(formData);
  };

  return (
    <form action={handleUpdate}>
      <input name="name" defaultValue={optimisticName} />
      <button disabled={isPending}>{isPending ? "Saving..." : "Save"}</button>
    </form>
  );
}
```

## Data Fetching Patterns

### Parallel Data Fetching

```tsx
// ❌ Bad - Sequential
async function SequentialPage() {
  const user = await getUser();
  const posts = await getPosts(user.id); // Waits for user
  const comments = await getComments(posts); // Waits for posts

  return <div>...</div>;
}

// ✅ Good - Parallel
async function ParallelPage() {
  const userId = await getUserId(); // Quick auth check

  // Fetch in parallel
  const [user, posts, comments] = await Promise.all([
    getUser(userId),
    getPosts(userId),
    getComments(userId),
  ]);

  return <div>...</div>;
}
```

### Streaming with Suspense

```tsx
// app/posts/page.tsx
import { Suspense } from "react";

export default function PostsPage() {
  return (
    <div>
      <h1>Posts</h1>
      {/* Stream in posts when ready */}
      <Suspense fallback={<PostsSkeleton />}>
        <PostsList />
      </Suspense>

      {/* Stream sidebar separately */}
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
    </div>
  );
}

async function PostsList() {
  const posts = await getPosts(); // This can take time
  return <div>{/* Render posts */}</div>;
}
```

### Server Actions

```tsx
// app/actions/user-actions.ts
"use server";

import { auth } from "@clerk/nextjs";
import { prisma } from "@/lib/db";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
});

export async function updateProfile(formData: FormData) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const validatedData = updateProfileSchema.parse({
    name: formData.get("name"),
    bio: formData.get("bio"),
  });

  try {
    await prisma.user.update({
      where: { clerkId: userId },
      data: validatedData,
    });

    // Revalidate caches
    revalidatePath("/dashboard");
    revalidateTag("user-profile");

    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update profile" };
  }
}
```

## Route Handlers

### API Route Best Practices

```tsx
// app/api/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { prisma } from "@/lib/db";

// GET /api/bookings
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Add caching headers
    const bookings = await prisma.booking.findMany({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json(bookings, {
      headers: {
        "Cache-Control": "private, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

## SEO & Metadata

### Dynamic Metadata

```tsx
// app/instructors/[id]/page.tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const instructor = await getInstructor(params.id);

  if (!instructor) {
    return {};
  }

  return {
    title: `${instructor.name} - Swim Instructor`,
    description: instructor.bio,
    openGraph: {
      title: `${instructor.name} - Swim Instructor`,
      description: instructor.bio,
      images: [
        {
          url: instructor.image,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

export default async function InstructorPage({ params }: Props) {
  const instructor = await getInstructor(params.id);

  if (!instructor) {
    notFound();
  }

  return <InstructorProfile instructor={instructor} />;
}
```

### Sitemap Generation

```tsx
// app/sitemap.ts
import { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Get all public pages
  const instructors = await prisma.instructorProfile.findMany({
    where: { isActive: true },
    select: { id: true, updatedAt: true },
  });

  const instructorPages = instructors.map((instructor) => ({
    url: `https://swiminstructor.com/instructors/${instructor.id}`,
    lastModified: instructor.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: "https://swiminstructor.com",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://swiminstructor.com/about",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...instructorPages,
  ];
}
```

## Performance Optimization

### Image Optimization

```tsx
// components/optimized-image.tsx
import Image from "next/image";

interface Props {
  src: string;
  alt: string;
  priority?: boolean;
}

export function OptimizedImage({ src, alt, priority = false }: Props) {
  return (
    <div className="relative aspect-video">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        priority={priority}
        className="object-cover"
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
      />
    </div>
  );
}
```

### Link Prefetching

```tsx
// components/nav-link.tsx
import Link from "next/link";

export function NavLink({ href, children }: Props) {
  return (
    <Link
      href={href}
      prefetch={true} // Default in App Router
      className="hover:underline"
    >
      {children}
    </Link>
  );
}
```

### Route Segment Config

```tsx
// app/dashboard/page.tsx

// Static rendering (default)
export const dynamic = "auto";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Revalidate every hour
export const revalidate = 3600;

// Generate static params
export async function generateStaticParams() {
  const posts = await getPosts();

  return posts.map((post) => ({
    id: post.id,
  }));
}
```

## Styling Best Practices

### CSS Modules with Tailwind

```tsx
// components/card.module.css
.card {
  @apply rounded-lg shadow-lg p-6;
}

.card:hover {
  @apply shadow-xl transform -translate-y-1;
}

// components/card.tsx
import styles from './card.module.css'

export function Card({ children }: Props) {
  return (
    <div className={styles.card}>
      {children}
    </div>
  )
}
```

### Dark Mode Support

```tsx
// app/providers.tsx
"use client";

import { ThemeProvider } from "next-themes";

export function Providers({ children }: Props) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system">
      {children}
    </ThemeProvider>
  );
}

// app/layout.tsx
import { Providers } from "./providers";

export default function RootLayout({ children }: Props) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

## Security Patterns

### Content Security Policy

```tsx
// middleware.ts
import { NextResponse } from "next/server";

export function middleware() {
  const response = NextResponse.next();

  // Add CSP header
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.clerk.com",
    ].join("; ")
  );

  return response;
}
```

### Input Sanitization

```tsx
// lib/sanitize.ts
import DOMPurify from "isomorphic-dompurify";

export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

// Usage in component
export function Comment({ content }: { content: string }) {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: sanitizeHTML(content),
      }}
    />
  );
}
```

## Testing Patterns

### Component Testing

```tsx
// __tests__/components/booking-card.test.tsx
import { render, screen } from "@testing-library/react";
import { BookingCard } from "@/components/booking-card";

describe("BookingCard", () => {
  it("renders booking details", () => {
    const booking = {
      id: "1",
      date: new Date("2024-01-20"),
      instructor: "John Doe",
      status: "confirmed",
    };

    render(<BookingCard booking={booking} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
  });
});
```

### Integration Testing

```tsx
// __tests__/api/bookings.test.ts
import { GET } from "@/app/api/bookings/route";
import { auth } from "@clerk/nextjs";

jest.mock("@clerk/nextjs");

describe("/api/bookings", () => {
  it("returns 401 when not authenticated", async () => {
    (auth as jest.Mock).mockReturnValue({ userId: null });

    const request = new Request("http://localhost/api/bookings");
    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});
```
